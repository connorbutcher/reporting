using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;
using Reporting.DAL.Filtering;
using Reporting.DAL.Formulas;

namespace Reporting.DAL.Repositories;

/// <summary>Dataset metadata and column schema CRUD, plus the generic filtered row query.</summary>
public class DatasetRepository(ReportingDbContext db, FormulaCalculationService formulas, DatasetResolver resolver)
{
    private readonly DatasetCloner _cloner = new(db);
    private readonly FilteredDatasetValidator _filteredValidator = new(db, resolver);
    private readonly DatasetRowQuery _rowQuery = new(db, resolver);
    private readonly DatasetColumnEditor _columns = new(db, formulas);

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
    public Task<DatasetQueryResultDto?> QueryAsync(int id, FilterGroupDto? filter)
    {
        return _rowQuery.QueryAsync(id, filter);
    }

    /// <summary>Counted in SQL without loading rows. Same errors as <see cref="QueryAsync"/>.</summary>
    public Task<DatasetCountResultDto?> CountAsync(int id, FilterGroupDto? filter)
    {
        return _rowQuery.CountAsync(id, filter);
    }

    /// <summary>Distinct non-empty values, ordered and capped. Null when the column doesn't exist.</summary>
    public Task<List<string>?> GetColumnValuesAsync(int id, Guid columnId, string? search, int limit)
    {
        return _rowQuery.ColumnValuesAsync(id, columnId, search, limit);
    }

    /// <summary>Throws <see cref="DataValidationException"/> when the config's kind doesn't match the column's type.</summary>
    public Task<DatasetColumnDto?> UpdateColumnConfigurationAsync(int id, Guid columnId, DatasetColumnConfig configuration)
    {
        return _columns.UpdateConfigurationAsync(id, columnId, configuration);
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

    public Task<DatasetColumnDto?> AddColumnAsync(int id, string name, DatasetColumnType type)
    {
        return _columns.AddAsync(id, name, type);
    }

    public Task<DatasetColumnDto?> UpdateColumnAsync(int id, Guid columnId, string name, DatasetColumnType type)
    {
        return _columns.UpdateAsync(id, columnId, name, type);
    }

    /// <summary>Throws <see cref="DataConflictException"/> while a formula still reads the column.</summary>
    public Task<bool> DeleteColumnAsync(int id, Guid columnId)
    {
        return _columns.DeleteAsync(id, columnId);
    }

    public Task<DatasetSchemaDto?> ReorderColumnsAsync(int id, List<Guid> columnIds)
    {
        return _columns.ReorderAsync(id, columnIds);
    }
}
