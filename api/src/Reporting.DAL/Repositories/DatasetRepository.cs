using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;
using Reporting.DAL.Filtering;

namespace Reporting.DAL.Repositories;

/// <summary>All querying and persistence for datasets, their columns, rows and cells.</summary>
public class DatasetRepository(ReportingDbContext db)
{
    public async Task<List<DatasetSummaryDto>> GetAllAsync()
    {
        var datasets = await db.Datasets.ToListAsync();
        return datasets.Select(d => d.ToSummaryDto()).ToList();
    }

    public async Task<DatasetSchemaDto?> GetSchemaAsync(Guid id)
    {
        var dataset = await db.Datasets
            .Include(d => d.Columns)
            .FirstOrDefaultAsync(d => d.Id == id);
        return dataset?.ToSchemaDto();
    }

    public async Task<DatasetDataDto?> GetDataAsync(Guid id)
    {
        var dataset = await db.Datasets
            .Include(d => d.Rows).ThenInclude(r => r.Cells)
            .FirstOrDefaultAsync(d => d.Id == id);
        return dataset?.ToDataDto();
    }

    /// <summary>
    /// The rows matching a filter. Filtering runs in SQL so a widget never pulls
    /// rows it won't show. Throws <see cref="FilterException"/> for a filter that
    /// doesn't match the dataset's schema; null means the dataset itself wasn't found.
    /// </summary>
    public async Task<DatasetQueryResultDto?> QueryAsync(Guid id, FilterGroupDto? filter)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        var predicate = FilterTranslator.Build(filter, dataset.Columns.ToDictionary(c => c.Id));

        var all = db.DatasetRows.Where(r => r.DatasetId == id);
        var matching = predicate is null ? all : all.Where(predicate);

        var rows = await matching.Include(r => r.Cells).ToListAsync();

        return new DatasetQueryResultDto
        {
            Id = dataset.Id,
            Name = dataset.Name,
            Rows = rows.Select(r => r.ToDto()).ToList(),
            TotalRowCount = await all.CountAsync(),
            MatchedRowCount = rows.Count
        };
    }

    /// <summary>Replaces a column's free-form display configuration blob.</summary>
    public async Task<DatasetColumnDto?> UpdateColumnConfigurationAsync(Guid id, Guid columnId, string configurationJson)
    {
        var column = await db.DatasetColumns.FirstOrDefaultAsync(c => c.Id == columnId && c.DatasetId == id);
        if (column is null) return null;

        column.ConfigurationJson = configurationJson;
        await db.SaveChangesAsync();
        return column.ToDto();
    }

    // --- dataset management ---------------------------------------------------

    public async Task<DatasetSummaryDto> CreateAsync(string name)
    {
        var dataset = new Dataset { Id = Guid.NewGuid(), Name = name };
        db.Datasets.Add(dataset);
        await db.SaveChangesAsync();
        return dataset.ToSummaryDto();
    }

    public async Task<DatasetSummaryDto?> RenameAsync(Guid id, string name)
    {
        var dataset = await db.Datasets.FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        dataset.Name = name;
        await db.SaveChangesAsync();
        return dataset.ToSummaryDto();
    }

    public async Task<bool> DeleteAsync(Guid id)
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

    public async Task<DatasetColumnDto?> AddColumnAsync(Guid id, string name, DatasetColumnType type)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        var column = new DatasetColumn
        {
            Id = Guid.NewGuid(),
            DatasetId = id,
            Name = name,
            Type = type,
            Order = dataset.Columns.Count == 0 ? 0 : dataset.Columns.Max(c => c.Order) + 1,
        };

        dataset.Columns.Add(column);
        // The id is generated here, so change detection would otherwise read
        // this as an existing row and emit an UPDATE that matches nothing.
        db.Entry(column).State = EntityState.Added;

        await db.SaveChangesAsync();
        return column.ToDto();
    }

    public async Task<DatasetColumnDto?> UpdateColumnAsync(Guid id, Guid columnId, string name, DatasetColumnType type)
    {
        var column = await db.DatasetColumns.FirstOrDefaultAsync(c => c.Id == columnId && c.DatasetId == id);
        if (column is null) return null;

        var typeChanged = column.Type != type;
        column.Name = name;
        column.Type = type;

        if (typeChanged)
        {
            // The typed fields were parsed under the old type, so they're now wrong;
            // re-derive them from the text each cell still carries.
            var cells = await db.DatasetCells.Where(c => c.ColumnId == columnId).ToListAsync();
            foreach (var cell in cells) CellValues.Apply(cell, cell.StringValue, type);
        }

        await db.SaveChangesAsync();
        return column.ToDto();
    }

    public async Task<bool> DeleteColumnAsync(Guid id, Guid columnId)
    {
        var column = await db.DatasetColumns.FirstOrDefaultAsync(c => c.Id == columnId && c.DatasetId == id);
        if (column is null) return false;

        db.DatasetColumns.Remove(column);

        // Cells reference the column by id without a FK, so clear them explicitly
        // rather than leaving rows carrying values for a column that's gone.
        var cells = await db.DatasetCells.Where(c => c.ColumnId == columnId).ToListAsync();
        db.DatasetCells.RemoveRange(cells);

        await db.SaveChangesAsync();
        return true;
    }

    public async Task<DatasetSchemaDto?> ReorderColumnsAsync(Guid id, List<Guid> columnIds)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        for (var i = 0; i < columnIds.Count; i++)
        {
            var column = dataset.Columns.FirstOrDefault(c => c.Id == columnIds[i]);
            if (column is not null) column.Order = i;
        }

        await db.SaveChangesAsync();
        return dataset.ToSchemaDto();
    }

    // --- rows -----------------------------------------------------------------

    public async Task<DatasetRowDto?> AddRowAsync(Guid id, Dictionary<Guid, string> values)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        var row = new DatasetRow { Id = Guid.NewGuid(), DatasetId = id };
        ApplyValues(dataset, row, values);

        db.DatasetRows.Add(row);
        await db.SaveChangesAsync();
        return row.ToDto();
    }

    public async Task<DatasetRowDto?> UpdateRowAsync(Guid id, Guid rowId, Dictionary<Guid, string> values)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        var row = await db.DatasetRows
            .Include(r => r.Cells)
            .FirstOrDefaultAsync(r => r.Id == rowId && r.DatasetId == id);
        if (row is null) return null;

        ApplyValues(dataset, row, values);
        await db.SaveChangesAsync();
        return row.ToDto();
    }

    public async Task<bool> DeleteRowAsync(Guid id, Guid rowId)
    {
        var row = await db.DatasetRows.FirstOrDefaultAsync(r => r.Id == rowId && r.DatasetId == id);
        if (row is null) return false;

        db.DatasetRows.Remove(row);
        await db.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Rewrites a row's cells from the submitted values, parsing each against its
    /// column's type. Values for columns the dataset doesn't have are ignored, so
    /// stale keys never accumulate.
    /// </summary>
    private void ApplyValues(Dataset dataset, DatasetRow row, Dictionary<Guid, string> values)
    {
        var columnsById = dataset.Columns.ToDictionary(c => c.Id);

        foreach (var (columnId, raw) in values)
        {
            if (!columnsById.TryGetValue(columnId, out var column)) continue;

            var cell = row.Cells.FirstOrDefault(c => c.ColumnId == columnId);
            if (cell is null)
            {
                cell = CellValues.Create(row.Id, columnId, raw, column.Type);
                row.Cells.Add(cell);

                // Cell ids are generated here, so change detection would otherwise read
                // this as an existing row and emit an UPDATE that matches nothing.
                db.Entry(cell).State = EntityState.Added;
            }
            else
            {
                CellValues.Apply(cell, raw, column.Type);
            }
        }

        // A value the client omitted means the cell was cleared.
        var submitted = values.Keys.ToHashSet();
        var dropped = row.Cells.Where(c => !submitted.Contains(c.ColumnId)).ToList();
        foreach (var cell in dropped)
        {
            row.Cells.Remove(cell);
            db.DatasetCells.Remove(cell);
        }
    }
}
