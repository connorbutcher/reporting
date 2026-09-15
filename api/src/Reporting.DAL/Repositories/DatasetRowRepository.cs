using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;
using Reporting.DAL.Formulas;

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

    /// <summary>
    /// A window of a dataset's rows for the editor grid's lazy virtual scroll:
    /// <paramref name="count"/> rows ordered by insertion (their primary key)
    /// starting at <paramref name="first"/>, plus the dataset's total row count.
    /// Only the window's cells are loaded, so a large dataset never materialises
    /// in full. Returns null if the dataset doesn't exist.
    /// </summary>
    public async Task<DatasetRowWindowDto?> GetRowWindowAsync(int id, int first, int count)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        var total = await db.DatasetRows.CountAsync(r => r.DatasetId == id);
        var rows = await db.DatasetRows
            .Where(r => r.DatasetId == id)
            .OrderBy(r => r.Id)
            .Skip(Math.Max(first, 0))
            .Take(Math.Clamp(count, 0, 500))
            .Include(r => r.Cells)
            .ToListAsync();

        var columnRefById = dataset.Columns.ToDictionary(c => c.Id, c => c.RefId);
        return new DatasetRowWindowDto
        {
            Total = total,
            Rows = rows.Select(r => r.ToDto(columnRefById)).ToList(),
        };
    }

    public async Task<DatasetRowDto?> AddRowAsync(int id, Dictionary<Guid, string> values)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        var row = new DatasetRow { RefId = Guid.NewGuid(), Dataset = dataset };
        ApplyValues(dataset, row, values);
        RecomputeFormulas(dataset, row);

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
        RecomputeFormulas(dataset, row);
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
    /// Rewrites a row's cells from the submitted values, parsing each against its column's type.
    /// Values for columns the dataset doesn't have, or for a formula column, are ignored — a formula
    /// column's cells are never client-writable, only <see cref="RecomputeFormulas"/> touches them.
    /// Values are keyed by column RefId.
    /// </summary>
    private void ApplyValues(Dataset dataset, DatasetRow row, Dictionary<Guid, string> values)
    {
        var columnsByRef = dataset.Columns.Where(c => !c.IsComputed).ToDictionary(c => c.RefId);

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

        // A value the client omitted means the cell was cleared — but only for the columns the
        // client could have submitted a value for; a formula column's cell is left for
        // RecomputeFormulas to own entirely.
        var manualColumnIds = columnsByRef.Values.Select(c => c.Id).ToHashSet();
        var submittedPks = values.Keys
            .Where(columnsByRef.ContainsKey)
            .Select(k => columnsByRef[k].Id)
            .ToHashSet();
        var dropped = row.Cells.Where(c => manualColumnIds.Contains(c.ColumnId) && !submittedPks.Contains(c.ColumnId)).ToList();
        foreach (var cell in dropped)
        {
            row.Cells.Remove(cell);
            db.DatasetCells.Remove(cell);
        }
    }

    /// <summary>Recomputes this row's formula cells from the values <see cref="ApplyValues"/> just
    /// wrote — every add/update goes through this, so a computed column is always current with the
    /// row's other values, not just from a full dataset-level recompute.</summary>
    private static void RecomputeFormulas(Dataset dataset, DatasetRow row)
    {
        var ordered = FormulaRecompute.PrepareOrderedFormulas(dataset.Columns);
        if (ordered.Count > 0) FormulaRecompute.Row(row, ordered, dataset.Columns);
    }
}
