using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>Row and cell CRUD for a dataset.</summary>
public class DatasetRowRepository(ReportingDbContext db)
{
    public async Task<DatasetDataDto?> GetDataAsync(Guid id)
    {
        var dataset = await db.Datasets
            .Include(d => d.Rows).ThenInclude(r => r.Cells)
            .FirstOrDefaultAsync(d => d.Id == id);
        return dataset?.ToDataDto();
    }

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
