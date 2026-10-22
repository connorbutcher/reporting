using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;
using Reporting.DAL.Filtering;
using Reporting.DAL.Formulas;
using Reporting.DAL.Formulas.References;

namespace Reporting.DAL.Repositories;

/// <summary>Dataset metadata and column schema CRUD, plus the generic filtered row query.</summary>
public class DatasetRepository(ReportingDbContext db, FormulaCalculationService formulas, DatasetResolver resolver)
{
    private readonly DatasetCloner _cloner = new(db);
    private readonly FilteredDatasetValidator _filteredValidator = new(db, resolver);

    /// <summary>The owning report's permission context, or null if the dataset doesn't exist.</summary>
    public Task<DatasetOwner?> GetOwnerAsync(int datasetId)
    {
        return db.Datasets
            .Where(d => d.Id == datasetId)
            .Select(d => new DatasetOwner(
                d.ReportRevision!.ReportId,
                d.ReportRevision.Report!.FolderId,
                d.ReportRevision.Report.InheritsPermissions,
                d.ReportRevision.Kind == RevisionKind.Draft))
            .FirstOrDefaultAsync();
    }

    /// <summary>Null if the report has no draft checked out.</summary>
    public Task<ReportDraftContext?> GetDraftContextAsync(int reportId)
    {
        return db.ReportRevisions
            .Where(rv => rv.ReportId == reportId && rv.Kind == RevisionKind.Draft)
            .Select(rv => new ReportDraftContext(rv.Id, rv.Report!.FolderId, rv.Report.InheritsPermissions))
            .FirstOrDefaultAsync();
    }

    public async Task<List<DatasetSourceDto>> GetSourcesAsync()
    {
        var sources = await db.DatasetSources.OrderBy(s => s.Id).ToListAsync();
        return sources.Select(s => s.ToDto()).ToList();
    }

    public async Task<List<DatasetSummaryDto>> GetAllForRevisionAsync(int revisionId)
    {
        var datasets = await db.Datasets
            .Include(d => d.Source)
            .Where(d => d.ReportRevisionId == revisionId)
            .OrderBy(d => d.Name)
            .ToListAsync();
        return datasets.Select(d => d.ToSummaryDto()).ToList();
    }

    public async Task<DatasetSchemaDto?> GetSchemaAsync(int id)
    {
        var dataset = await db.Datasets
            .Include(d => d.Source)
            .Include(d => d.Columns)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null)
        {
            return null;
        }

        if (dataset.Source!.Key != DatasetSourceKey.Filtered)
        {
            return dataset.ToSchemaDto();
        }

        // A filtered dataset keeps its own identity and config but inherits its base's columns.
        var resolved = await resolver.ResolveAsync(id);
        return resolved is null ? null : dataset.ToSchemaDto(resolved.Physical.Columns);
    }

    /// <summary>
    /// Filtered in SQL. Throws <see cref="FilterException"/> for a filter that doesn't match the schema;
    /// null means the dataset wasn't found.
    /// </summary>
    public async Task<DatasetQueryResultDto?> QueryAsync(int id, FilterGroupDto? filter)
    {
        var resolved = await resolver.ResolveAsync(id);
        if (resolved is null)
        {
            return null;
        }

        var filtered = await FilterRowsAsync(resolved, filter);
        var rows = await filtered.Matching.Include(r => r.Cells).ToListAsync();
        var columnRefById = resolved.Physical.Columns.ToDictionary(c => c.Id, c => c.RefId);

        return new DatasetQueryResultDto
        {
            Id = resolved.Id,
            Name = resolved.Name,
            Rows = rows.Select(r => r.ToDto(columnRefById)).ToList(),
            TotalRowCount = await filtered.All.CountAsync(),
            MatchedRowCount = rows.Count
        };
    }

    /// <summary>Counted in SQL without loading rows, so the filter panel can run it on every edit. Same errors as <see cref="QueryAsync"/>.</summary>
    public async Task<DatasetCountResultDto?> CountAsync(int id, FilterGroupDto? filter)
    {
        var resolved = await resolver.ResolveAsync(id);
        if (resolved is null)
        {
            return null;
        }

        var filtered = await FilterRowsAsync(resolved, filter);
        return new DatasetCountResultDto
        {
            TotalRowCount = await filtered.All.CountAsync(),
            MatchedRowCount = await filtered.Matching.CountAsync()
        };
    }

    /// <summary>
    /// A column's distinct non-empty values for the filter value dropdowns, ordered and capped, optionally
    /// narrowed by <paramref name="search"/>. Null when the column doesn't exist, empty when it has no values.
    /// </summary>
    public async Task<List<string>?> GetColumnValuesAsync(int id, Guid columnId, string? search, int limit)
    {
        var resolved = await resolver.ResolveAsync(id);
        var column = resolved?.Physical.Columns.FirstOrDefault(c => c.RefId == columnId);
        if (column is null)
        {
            return null;
        }

        // Cells by ColumnId need no join back to rows, and ride the filtered (ColumnId, StringValue)
        // index as an ordered range scan that also satisfies DISTINCT and ORDER BY.
        var cells = db.DatasetCells
            .Where(c => c.ColumnId == column.Id && c.StringValue != null && c.StringValue != "");

        if (!string.IsNullOrWhiteSpace(search))
        {
            cells = cells.Where(c => c.StringValue!.Contains(search));
        }

        return await cells
            .Select(c => c.StringValue!)
            .Distinct()
            .OrderBy(v => v)
            .Take(Math.Clamp(limit, 1, 500))
            .ToListAsync();
    }

    /// <summary>Throws <see cref="DataValidationException"/> when the config's kind doesn't match the column's type.</summary>
    public async Task<DatasetColumnDto?> UpdateColumnConfigurationAsync(int id, Guid columnId, DatasetColumnConfig configuration)
    {
        var column = await db.DatasetColumns.FirstOrDefaultAsync(c => c.RefId == columnId && c.Dataset!.Id == id);
        if (column is null)
        {
            return null;
        }

        var expected = DatasetColumnConfig.KindFor(column.Type);
        if (configuration.Kind != expected)
        {
            throw new DataValidationException(
                $"Configuration of kind '{configuration.Kind}' doesn't match the column's type '{column.Type}' (expects '{expected}').");
        }

        column.SetConfig(configuration);
        await db.SaveChangesAsync();
        return column.ToDto();
    }

    /// <summary>Uses the source's default configuration. Null for an unknown source.</summary>
    public async Task<DatasetSummaryDto?> CreateAsync(int revisionId, string name, int sourceId)
    {
        var source = await db.DatasetSources.FirstOrDefaultAsync(s => s.Id == sourceId);
        if (source is null)
        {
            return null;
        }

        var dataset = new Dataset { ReportRevisionId = revisionId, Name = name, Source = source };
        dataset.SetSourceConfig(DatasetSourceConfigs.Default(source.Key));
        db.Datasets.Add(dataset);
        await db.SaveChangesAsync();
        return dataset.ToSummaryDto();
    }

    public async Task<DatasetSummaryDto?> CloneAsync(int id, string name)
    {
        var copy = await _cloner.CloneAsync(id, name);
        return copy?.ToSummaryDto();
    }

    public async Task<DatasetSummaryDto?> RenameAsync(int id, string name)
    {
        var dataset = await db.Datasets.Include(d => d.Source).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null)
        {
            return null;
        }

        dataset.Name = name;
        await db.SaveChangesAsync();
        return dataset.ToSummaryDto();
    }

    /// <summary>Resets the config to the new source's default. Throws <see cref="DataValidationException"/> for an unknown source.</summary>
    public async Task<DatasetSchemaDto?> SetSourceAsync(int id, int sourceId)
    {
        var dataset = await db.Datasets
            .Include(d => d.Source)
            .Include(d => d.Columns)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null)
        {
            return null;
        }

        var source = await db.DatasetSources.FirstOrDefaultAsync(s => s.Id == sourceId);
        if (source is null)
        {
            throw new DataValidationException("Unknown dataset source.");
        }

        dataset.Source = source;
        dataset.DatasetSourceId = source.Id;
        dataset.SetSourceConfig(DatasetSourceConfigs.Default(source.Key));
        await db.SaveChangesAsync();
        return dataset.ToSchemaDto();
    }

    /// <summary>Throws <see cref="DataValidationException"/> when the config's source doesn't match the dataset's.</summary>
    public async Task<DatasetSchemaDto?> UpdateSourceConfigAsync(int id, DatasetSourceConfig config)
    {
        var dataset = await db.Datasets
            .Include(d => d.Source)
            .Include(d => d.Columns)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null)
        {
            return null;
        }

        if (config.SourceKey != dataset.Source!.Key)
        {
            throw new DataValidationException(
                $"Configuration for '{config.SourceKey}' doesn't match the dataset's source '{dataset.Source.Key}'.");
        }

        if (config is FilteredDatasetSourceConfig filtered)
        {
            await _filteredValidator.ValidateAsync(dataset, filtered);
        }

        dataset.SetSourceConfig(config);
        await db.SaveChangesAsync();
        return config is FilteredDatasetSourceConfig
            ? (await GetSchemaAsync(id))!
            : dataset.ToSchemaDto();
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var dataset = await db.Datasets.FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null)
        {
            return false;
        }

        // Widgets bound here show an issue in the builder rather than blocking the delete.
        db.Datasets.Remove(dataset);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<DatasetColumnDto?> AddColumnAsync(int id, string name, DatasetColumnType type)
    {
        var dataset = await db.Datasets.Include(d => d.Source).Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null)
        {
            return null;
        }

        EnsureNotFiltered(dataset);

        var column = new DatasetColumn
        {
            RefId = Guid.NewGuid(),
            Name = name,
            Type = type,
            Order = dataset.Columns.Count == 0 ? 0 : dataset.Columns.Max(c => c.Order) + 1,
        };

        dataset.Columns.Add(column);
        await db.SaveChangesAsync();

        // A new column can be what a formula that was waiting on a missing column needs.
        if (dataset.Columns.Any(c => c.FormulaError is not null))
        {
            await formulas.RecalculateAsync(dataset);
        }

        return column.ToDto();
    }

    public async Task<DatasetColumnDto?> UpdateColumnAsync(int id, Guid columnId, string name, DatasetColumnType type)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        var column = dataset?.Columns.FirstOrDefault(c => c.RefId == columnId);
        if (dataset is null || column is null)
        {
            return null;
        }

        var typeChanged = column.Type != type;
        if (typeChanged && column.IsComputed)
        {
            throw new DataValidationException("A formula column's type comes from its formula; edit the formula to change it.");
        }

        var oldName = column.Name;
        column.Name = name;
        column.Type = type;

        // Formulas name columns, so a rename carries through to the formulas that read this one.
        if (!string.Equals(oldName, name, StringComparison.Ordinal))
        {
            FormulaColumnRename.Apply(dataset.Columns, oldName, name);
        }

        if (typeChanged)
        {
            await ReparseCellsAsync(column.Id, type);
        }

        await db.SaveChangesAsync();

        // Formulas that read this column see different values (or types) now.
        if (typeChanged && dataset.Columns.Any(c => c.IsComputed))
        {
            await formulas.RecalculateAsync(dataset);
        }
        return column.ToDto();
    }

    public async Task<bool> DeleteColumnAsync(int id, Guid columnId)
    {
        var column = await db.DatasetColumns.FirstOrDefaultAsync(c => c.RefId == columnId && c.Dataset!.Id == id);
        if (column is null)
        {
            return false;
        }

        var formulaColumns = await db.DatasetColumns.Where(c => c.DatasetId == id && c.FormulaExpression != null).ToListAsync();
        var dependents = FormulaColumnRename.Dependents(formulaColumns, column);
        if (dependents.Count > 0)
        {
            throw new DataConflictException(
                $"[{column.Name}] is read by the formula in {string.Join(", ", dependents.Select(d => $"[{d}]"))}. Change or remove that formula first.");
        }

        db.DatasetColumns.Remove(column);

        // Cells reference the column without a FK, so they don't cascade.
        var cells = await db.DatasetCells.Where(c => c.ColumnId == column.Id).ToListAsync();
        db.DatasetCells.RemoveRange(cells);

        await db.SaveChangesAsync();
        return true;
    }

    public async Task<DatasetSchemaDto?> ReorderColumnsAsync(int id, List<Guid> columnIds)
    {
        var dataset = await db.Datasets
            .Include(d => d.Source)
            .Include(d => d.Columns)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null)
        {
            return null;
        }

        EnsureNotFiltered(dataset);

        for (var i = 0; i < columnIds.Count; i++)
        {
            var column = dataset.Columns.FirstOrDefault(c => c.RefId == columnIds[i]);
            if (column is not null)
            {
                column.Order = i;
            }
        }

        await db.SaveChangesAsync();
        return dataset.ToSchemaDto();
    }

    /// <summary>Typed fields were parsed under the old type; re-derive them from each cell's text.</summary>
    private async Task ReparseCellsAsync(int columnId, DatasetColumnType type)
    {
        var cells = await db.DatasetCells.Where(c => c.ColumnId == columnId).ToListAsync();
        foreach (var cell in cells)
        {
            CellValues.Apply(cell, cell.StringValue, type);
        }
    }

    /// <summary>Columns are referenced by RefId in filters and resolved to int ids for the cell comparison.</summary>
    private async Task<FilteredRows> FilterRowsAsync(ResolvedDataset resolved, FilterGroupDto? filter)
    {
        var physical = resolved.Physical;
        var columnsByRef = physical.Columns.ToDictionary(c => c.RefId);
        var operatorCatalogue = await FilterOperators.LoadCatalogueAsync(db);
        var baseRows = db.DatasetRows.Where(r => r.DatasetId == physical.Id);
        var all = FilterTranslator.Apply(baseRows, resolved.MandatoryFilter, columnsByRef, operatorCatalogue: operatorCatalogue);
        var matching = FilterTranslator.Apply(all, filter, columnsByRef, operatorCatalogue: operatorCatalogue);
        return new FilteredRows(all, matching);
    }

    /// <summary>A filtered dataset is a read-only view over its base, so it can't be edited directly.</summary>
    private static void EnsureNotFiltered(Dataset dataset)
    {
        if (dataset.Source?.Key == DatasetSourceKey.Filtered)
        {
            throw new DataValidationException("A filtered dataset's columns and rows come from its base dataset and can't be edited directly.");
        }
    }
}
