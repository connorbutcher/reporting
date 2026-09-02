using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;
using Reporting.DAL.Filtering;

namespace Reporting.DAL.Repositories;

/// <summary>Where a dataset sits in the permission tree, and whether it belongs to an editable draft.</summary>
public sealed record DatasetOwner(int ReportId, int? FolderId, bool InheritsPermissions, bool IsDraft);

/// <summary>The draft revision of a report plus the report's permission context, for scoping dataset list/create.</summary>
public sealed record ReportDraftContext(int RevisionId, int? FolderId, bool InheritsPermissions);

/// <summary>Dataset metadata and column schema CRUD, plus the generic filtered row query.</summary>
public class DatasetRepository(ReportingDbContext db)
{
    // --- authorization context (resolved by the controller against the owning report) --------

    /// <summary>The owning report's permission context for a dataset, or null if it doesn't exist.</summary>
    public Task<DatasetOwner?> GetOwnerAsync(int datasetId) =>
        db.Datasets
            .Where(d => d.Id == datasetId)
            .Select(d => new DatasetOwner(
                d.ReportRevision!.ReportId,
                d.ReportRevision.Report!.FolderId,
                d.ReportRevision.Report.InheritsPermissions,
                d.ReportRevision.Kind == RevisionKind.Draft))
            .FirstOrDefaultAsync();

    /// <summary>The checked-out draft revision of a report plus its permission context, or null if there's no draft.</summary>
    public Task<ReportDraftContext?> GetDraftContextAsync(int reportId) =>
        db.ReportRevisions
            .Where(rv => rv.ReportId == reportId && rv.Kind == RevisionKind.Draft)
            .Select(rv => new ReportDraftContext(rv.Id, rv.Report!.FolderId, rv.Report.InheritsPermissions))
            .FirstOrDefaultAsync();

    // --- reads ----------------------------------------------------------------

    /// <summary>The fixed set of source systems a dataset can draw from, for the source pickers.</summary>
    public async Task<List<DatasetSourceDto>> GetSourcesAsync()
    {
        var sources = await db.DatasetSources.OrderBy(s => s.Id).ToListAsync();
        return sources.Select(s => s.ToDto()).ToList();
    }

    /// <summary>Every dataset owned by one revision (a report's draft), for the builder's dataset pickers.</summary>
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
        return dataset?.ToSchemaDto();
    }

    /// <summary>
    /// The rows matching a filter. Filtering runs in SQL so a widget never pulls
    /// rows it won't show. Throws <see cref="FilterException"/> for a filter that
    /// doesn't match the dataset's schema; null means the dataset itself wasn't found.
    /// </summary>
    public async Task<DatasetQueryResultDto?> QueryAsync(int id, FilterGroupDto? filter)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        // The client references columns by their RefId, so the translator is keyed that way and
        // resolves each to the column's int id for the cell comparison.
        var predicate = FilterTranslator.Build(filter, dataset.Columns.ToDictionary(c => c.RefId));

        var all = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var matching = predicate is null ? all : all.Where(predicate);

        var rows = await matching.Include(r => r.Cells).ToListAsync();
        var columnRefById = dataset.Columns.ToDictionary(c => c.Id, c => c.RefId);

        return new DatasetQueryResultDto
        {
            Id = dataset.Id,
            Name = dataset.Name,
            Rows = rows.Select(r => r.ToDto(columnRefById)).ToList(),
            TotalRowCount = await all.CountAsync(),
            MatchedRowCount = rows.Count
        };
    }

    /// <summary>
    /// The distinct non-empty values a column actually holds, for the filter panel's value
    /// dropdowns — so filtering a column like "shift" offers its real day/night values rather
    /// than free text. Ordered and capped (a high-cardinality column isn't a dropdown); an
    /// optional <paramref name="search"/> narrows to matching values for type-ahead. Values are
    /// matched against the cell's canonical text, so this works for every column type. Null when
    /// the column doesn't exist (a 404), distinct from an empty list (the column has no values).
    /// </summary>
    public async Task<List<string>?> GetColumnValuesAsync(int id, Guid columnId, string? search, int limit)
    {
        var column = await db.DatasetColumns.FirstOrDefaultAsync(c => c.RefId == columnId && c.Dataset!.Id == id);
        if (column is null) return null;

        // A column belongs to exactly one dataset, so every cell carrying its ColumnId is already
        // scoped to this dataset — no join back to the rows is needed. Filtering by ColumnId and the
        // non-null string lets this ride the filtered (ColumnId, StringValue) index as an ordered
        // range scan, which also satisfies the DISTINCT and ORDER BY without a separate sort.
        var cells = db.DatasetCells
            .Where(c => c.ColumnId == column.Id && c.StringValue != null && c.StringValue != "");

        if (!string.IsNullOrWhiteSpace(search))
            cells = cells.Where(c => c.StringValue!.Contains(search));

        return await cells
            .Select(c => c.StringValue!)
            .Distinct()
            .OrderBy(v => v)
            .Take(Math.Clamp(limit, 1, 500))
            .ToListAsync();
    }

    /// <summary>
    /// Replaces a column's typed display configuration. Null when the column doesn't exist; throws
    /// <see cref="DataValidationException"/> when the config's kind doesn't match the column's type.
    /// </summary>
    public async Task<DatasetColumnDto?> UpdateColumnConfigurationAsync(int id, Guid columnId, DatasetColumnConfig configuration)
    {
        var column = await db.DatasetColumns.FirstOrDefaultAsync(c => c.RefId == columnId && c.Dataset!.Id == id);
        if (column is null) return null;

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

    // --- dataset management ---------------------------------------------------

    /// <summary>
    /// Creates a dataset on a revision, pointed at <paramref name="sourceId"/> with that source's
    /// default configuration. Null when the source id isn't one of the known sources.
    /// </summary>
    public async Task<DatasetSummaryDto?> CreateAsync(int revisionId, string name, int sourceId)
    {
        var source = await db.DatasetSources.FirstOrDefaultAsync(s => s.Id == sourceId);
        if (source is null) return null;

        var dataset = new Dataset { ReportRevisionId = revisionId, Name = name, Source = source };
        dataset.SetSourceConfig(DatasetSourceConfigs.Default(source.Key));
        db.Datasets.Add(dataset);
        await db.SaveChangesAsync();
        return dataset.ToSummaryDto();
    }

    /// <summary>
    /// Deep-copies a dataset within the same revision — its source, config, columns, rows and
    /// cells — under <paramref name="name"/>. Column and row RefIds are regenerated so the copy is
    /// fully independent. Null when the dataset doesn't exist.
    /// </summary>
    public async Task<DatasetSummaryDto?> CloneAsync(int id, string name)
    {
        var source = await db.Datasets
            .Include(d => d.Source)
            .Include(d => d.Columns)
            .Include(d => d.Rows).ThenInclude(r => r.Cells)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (source is null) return null;

        var copy = new Dataset
        {
            ReportRevisionId = source.ReportRevisionId,
            Name = name,
            DatasetSourceId = source.DatasetSourceId,
            Source = source.Source,
            SourceConfigJson = source.SourceConfigJson,
        };

        // Copy columns, tracking old-column-id -> new-column so cells can be remapped once
        // the copies have database-assigned ids (the same two-phase the seeder/checkout use).
        var columnByOldId = new Dictionary<int, DatasetColumn>();
        foreach (var column in source.Columns)
        {
            var columnCopy = new DatasetColumn
            {
                RefId = Guid.NewGuid(),
                Name = column.Name,
                Type = column.Type,
                Order = column.Order,
                ConfigurationJson = column.ConfigurationJson,
            };
            copy.Columns.Add(columnCopy);
            columnByOldId[column.Id] = columnCopy;
        }

        var rowPairs = new List<(DatasetRow Source, DatasetRow Copy)>();
        foreach (var row in source.Rows)
        {
            var rowCopy = new DatasetRow { RefId = Guid.NewGuid() };
            copy.Rows.Add(rowCopy);
            rowPairs.Add((row, rowCopy));
        }

        db.Datasets.Add(copy);
        await db.SaveChangesAsync();

        foreach (var (sourceRow, rowCopy) in rowPairs)
        {
            foreach (var cell in sourceRow.Cells)
            {
                if (!columnByOldId.TryGetValue(cell.ColumnId, out var newColumn)) continue;
                db.DatasetCells.Add(new DatasetCell
                {
                    RowId = rowCopy.Id,
                    ColumnId = newColumn.Id,
                    StringValue = cell.StringValue,
                    NumberValue = cell.NumberValue,
                    BoolValue = cell.BoolValue,
                    DateValue = cell.DateValue,
                });
            }
        }
        await db.SaveChangesAsync();
        return copy.ToSummaryDto();
    }

    public async Task<DatasetSummaryDto?> RenameAsync(int id, string name)
    {
        var dataset = await db.Datasets.Include(d => d.Source).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        dataset.Name = name;
        await db.SaveChangesAsync();
        return dataset.ToSummaryDto();
    }

    /// <summary>
    /// Repoints a dataset at a different source and resets its configuration to that source's
    /// default — the old config's shape no longer applies. Null when the dataset doesn't exist;
    /// throws <see cref="DataValidationException"/> for an unknown source id.
    /// </summary>
    public async Task<DatasetSchemaDto?> SetSourceAsync(int id, int sourceId)
    {
        var dataset = await db.Datasets
            .Include(d => d.Source)
            .Include(d => d.Columns)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        var source = await db.DatasetSources.FirstOrDefaultAsync(s => s.Id == sourceId);
        if (source is null) throw new DataValidationException("Unknown dataset source.");

        dataset.Source = source;
        dataset.DatasetSourceId = source.Id;
        dataset.SetSourceConfig(DatasetSourceConfigs.Default(source.Key));
        await db.SaveChangesAsync();
        return dataset.ToSchemaDto();
    }

    /// <summary>
    /// Replaces a dataset's source configuration. Null when the dataset doesn't exist; throws
    /// <see cref="DataValidationException"/> when the config's source doesn't match the dataset's.
    /// </summary>
    public async Task<DatasetSchemaDto?> UpdateSourceConfigAsync(int id, DatasetSourceConfig config)
    {
        var dataset = await db.Datasets
            .Include(d => d.Source)
            .Include(d => d.Columns)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        if (config.SourceKey != dataset.Source!.Key)
        {
            throw new DataValidationException(
                $"Configuration for '{config.SourceKey}' doesn't match the dataset's source '{dataset.Source.Key}'.");
        }

        dataset.SetSourceConfig(config);
        await db.SaveChangesAsync();
        return dataset.ToSchemaDto();
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var dataset = await db.Datasets.FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return false;

        // Columns and rows cascade; widgets pointing here are reported as an
        // issue in the builder rather than blocking the delete.
        db.Datasets.Remove(dataset);
        await db.SaveChangesAsync();
        return true;
    }

    // --- columns --------------------------------------------------------------

    public async Task<DatasetColumnDto?> AddColumnAsync(int id, string name, DatasetColumnType type)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        var column = new DatasetColumn
        {
            RefId = Guid.NewGuid(),
            Name = name,
            Type = type,
            Order = dataset.Columns.Count == 0 ? 0 : dataset.Columns.Max(c => c.Order) + 1,
        };

        dataset.Columns.Add(column);
        await db.SaveChangesAsync();
        return column.ToDto();
    }

    public async Task<DatasetColumnDto?> UpdateColumnAsync(int id, Guid columnId, string name, DatasetColumnType type)
    {
        var column = await db.DatasetColumns.FirstOrDefaultAsync(c => c.RefId == columnId && c.Dataset!.Id == id);
        if (column is null) return null;

        var typeChanged = column.Type != type;
        column.Name = name;
        column.Type = type;

        if (typeChanged)
        {
            // The typed fields were parsed under the old type, so they're now wrong;
            // re-derive them from the text each cell still carries.
            var cells = await db.DatasetCells.Where(c => c.ColumnId == column.Id).ToListAsync();
            foreach (var cell in cells) CellValues.Apply(cell, cell.StringValue, type);
        }

        await db.SaveChangesAsync();
        return column.ToDto();
    }

    public async Task<bool> DeleteColumnAsync(int id, Guid columnId)
    {
        var column = await db.DatasetColumns.FirstOrDefaultAsync(c => c.RefId == columnId && c.Dataset!.Id == id);
        if (column is null) return false;

        db.DatasetColumns.Remove(column);

        // Cells reference the column by id without a FK, so clear them explicitly
        // rather than leaving rows carrying values for a column that's gone.
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
        if (dataset is null) return null;

        for (var i = 0; i < columnIds.Count; i++)
        {
            var column = dataset.Columns.FirstOrDefault(c => c.RefId == columnIds[i]);
            if (column is not null) column.Order = i;
        }

        await db.SaveChangesAsync();
        return dataset.ToSchemaDto();
    }
}
