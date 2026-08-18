using System.Text.Json;
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

    /// <summary>Every dataset owned by one revision (a report's draft), for the builder's dataset pickers.</summary>
    public async Task<List<DatasetSummaryDto>> GetAllForRevisionAsync(int revisionId)
    {
        var datasets = await db.Datasets
            .Where(d => d.ReportRevisionId == revisionId)
            .OrderBy(d => d.Name)
            .ToListAsync();
        return datasets.Select(d => d.ToSummaryDto()).ToList();
    }

    public async Task<DatasetSchemaDto?> GetSchemaAsync(int id)
    {
        var dataset = await db.Datasets
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

    /// <summary>Replaces a column's free-form display configuration blob.</summary>
    public async Task<DatasetColumnDto?> UpdateColumnConfigurationAsync(int id, Guid columnId, JsonElement configuration)
    {
        if (configuration.ValueKind is not (JsonValueKind.Object or JsonValueKind.Null or JsonValueKind.Undefined))
        {
            throw new DataValidationException("Column configuration must be a JSON object.");
        }

        var column = await db.DatasetColumns.FirstOrDefaultAsync(c => c.RefId == columnId && c.Dataset!.Id == id);
        if (column is null) return null;

        column.ConfigurationJson = configuration.ValueKind == JsonValueKind.Object
            ? configuration.GetRawText()
            : "{}";
        await db.SaveChangesAsync();
        return column.ToDto();
    }

    // --- dataset management ---------------------------------------------------

    public async Task<DatasetSummaryDto> CreateAsync(int revisionId, string name)
    {
        var dataset = new Dataset { ReportRevisionId = revisionId, Name = name };
        db.Datasets.Add(dataset);
        await db.SaveChangesAsync();
        return dataset.ToSummaryDto();
    }

    public async Task<DatasetSummaryDto?> RenameAsync(int id, string name)
    {
        var dataset = await db.Datasets.FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        dataset.Name = name;
        await db.SaveChangesAsync();
        return dataset.ToSummaryDto();
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
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
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
