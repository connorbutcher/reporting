using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>Row and cell CRUD for a dataset.</summary>
public class DatasetRowRepository(ReportingDbContext db)
{
    public async Task<DatasetDataDto?> GetDataAsync(int id)
    {
        var dataset = await db.Datasets
            .Include(d => d.Columns)
            .Include(d => d.Rows).ThenInclude(r => r.Cells)
            .FirstOrDefaultAsync(d => d.Id == id);
        return dataset?.ToDataDto();
    }

    public async Task<DatasetRowDto?> AddRowAsync(int id, Dictionary<Guid, string> values)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        var row = new DatasetRow { RefId = Guid.NewGuid(), Dataset = dataset };
        ApplyValues(dataset, row, values);

        db.DatasetRows.Add(row);
        await db.SaveChangesAsync();
        return row.ToDto(ColumnRefMap(dataset));
    }

    public async Task<DatasetRowDto?> UpdateRowAsync(int id, Guid rowId, Dictionary<Guid, string> values)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        var row = await db.DatasetRows
            .Include(r => r.Cells)
            .FirstOrDefaultAsync(r => r.RefId == rowId && r.Dataset!.Id == id);
        if (row is null) return null;

        ApplyValues(dataset, row, values);
        await db.SaveChangesAsync();
        return row.ToDto(ColumnRefMap(dataset));
    }

    public async Task<bool> DeleteRowAsync(int id, Guid rowId)
    {
        var row = await db.DatasetRows.FirstOrDefaultAsync(r => r.RefId == rowId && r.Dataset!.Id == id);
        if (row is null) return false;

        db.DatasetRows.Remove(row);
        await db.SaveChangesAsync();
        return true;
    }

    private static IReadOnlyDictionary<int, Guid> ColumnRefMap(Dataset dataset) =>
        dataset.Columns.ToDictionary(c => c.Id, c => c.RefId);

    /// <summary>
    /// Rewrites a row's cells from the submitted values, parsing each against its
    /// column's type. Values for columns the dataset doesn't have are ignored, so
    /// stale keys never accumulate. Values are keyed by column RefId.
    /// </summary>
    private void ApplyValues(Dataset dataset, DatasetRow row, Dictionary<Guid, string> values)
    {
        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);

        foreach (var (columnRef, raw) in values)
        {
            if (!columnsByRef.TryGetValue(columnRef, out var column)) continue;

            var cell = row.Cells.FirstOrDefault(c => c.ColumnId == column.Id);
            if (cell is null)
            {
                cell = CellValues.Create(column.Id, raw, column.Type);
                row.Cells.Add(cell);
            }
            else
            {
                CellValues.Apply(cell, raw, column.Type);
            }
        }

        // A value the client omitted means the cell was cleared.
        var submittedPks = values.Keys
            .Where(columnsByRef.ContainsKey)
            .Select(k => columnsByRef[k].Id)
            .ToHashSet();
        var dropped = row.Cells.Where(c => !submittedPks.Contains(c.ColumnId)).ToList();
        foreach (var cell in dropped)
        {
            row.Cells.Remove(cell);
            db.DatasetCells.Remove(cell);
        }
    }
}
