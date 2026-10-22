using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;
using Reporting.DAL.Filtering;
using Reporting.DAL.Formulas;

namespace Reporting.DAL.Repositories;

/// <summary>Row and cell CRUD for a dataset.</summary>
public class DatasetRowRepository(ReportingDbContext db, FormulaCalculationService formulas, DatasetResolver resolver)
{
    public async Task<DatasetDataDto?> GetDataAsync(int id)
    {
        var resolved = await resolver.ResolveAsync(id);
        if (resolved is null)
        {
            return null;
        }

        if (resolved.MandatoryFilter is null)
        {
            var dataset = await db.Datasets
                .Include(d => d.Columns)
                .Include(d => d.Rows).ThenInclude(r => r.Cells)
                .FirstOrDefaultAsync(d => d.Id == resolved.Physical.Id);
            return dataset?.ToDataDto();
        }

        var physical = resolved.Physical;
        var columnsByRef = physical.Columns.ToDictionary(c => c.RefId);
        var operatorCatalogue = await FilterOperators.LoadCatalogueAsync(db);
        var baseRows = db.DatasetRows.Where(r => r.DatasetId == physical.Id);
        var rows = await FilterTranslator.Apply(baseRows, resolved.MandatoryFilter, columnsByRef, operatorCatalogue: operatorCatalogue)
            .Include(r => r.Cells)
            .ToListAsync();

        var data = RowMapping.BuildDataDto(physical, rows);
        data.Id = resolved.Id;
        data.Name = resolved.Name;
        return data;
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
        var resolved = await resolver.ResolveAsync(id);
        if (resolved is null)
        {
            return null;
        }

        var physical = resolved.Physical;

        var columnsByRef = physical.Columns.ToDictionary(c => c.RefId);
        var operatorCatalogue = await FilterOperators.LoadCatalogueAsync(db);
        var baseRows = db.DatasetRows.Where(r => r.DatasetId == physical.Id);
        var all = FilterTranslator.Apply(baseRows, resolved.MandatoryFilter, columnsByRef, operatorCatalogue: operatorCatalogue);

        var total = await all.CountAsync();
        var rows = await all
            .OrderBy(r => r.Id)
            .Skip(Math.Max(first, 0))
            .Take(Math.Clamp(count, 0, 500))
            .Include(r => r.Cells)
            .ToListAsync();

        var columnRefById = physical.Columns.ToDictionary(c => c.Id, c => c.RefId);
        return new DatasetRowWindowDto
        {
            Total = total,
            Rows = rows.Select(r => r.ToDto(columnRefById)).ToList(),
        };
    }

    public async Task<DatasetRowDto?> AddRowAsync(int id, Dictionary<Guid, string> values)
    {
        var dataset = await db.Datasets.Include(d => d.Source).Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null)
        {
            return null;
        }

        DatasetGuards.EnsureNotFiltered(dataset, "A filtered dataset's rows come from its base dataset and can't be edited directly.");

        var row = new DatasetRow { RefId = Guid.NewGuid(), Dataset = dataset };
        ApplyValues(dataset, row, values);
        await formulas.ApplyToRowAsync(dataset, row);

        db.DatasetRows.Add(row);
        await db.SaveChangesAsync();
        return row.ToDto(ColumnRefMap(dataset));
    }

    public async Task<DatasetRowDto?> UpdateRowAsync(int id, Guid rowId, Dictionary<Guid, string> values)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null)
        {
            return null;
        }

        var row = await db.DatasetRows
            .Include(r => r.Cells)
            .FirstOrDefaultAsync(r => r.RefId == rowId && r.Dataset!.Id == id);
        if (row is null)
        {
            return null;
        }

        ApplyValues(dataset, row, values);
        await formulas.ApplyToRowAsync(dataset, row);
        await db.SaveChangesAsync();
        return row.ToDto(ColumnRefMap(dataset));
    }

    public async Task<bool> DeleteRowAsync(int id, Guid rowId)
    {
        var row = await db.DatasetRows.FirstOrDefaultAsync(r => r.RefId == rowId && r.Dataset!.Id == id);
        if (row is null)
        {
            return false;
        }

        db.DatasetRows.Remove(row);
        await db.SaveChangesAsync();
        return true;
    }

    private static IReadOnlyDictionary<int, Guid> ColumnRefMap(Dataset dataset)
    {
        return dataset.Columns.ToDictionary(c => c.Id, c => c.RefId);
    }

    /// <summary>
    /// Rewrites a row's cells from the submitted values, parsing each against its
    /// column's type. Values for columns the dataset doesn't have are ignored, so
    /// stale keys never accumulate. Values are keyed by column RefId. A computed column can't
    /// be set by hand: anything submitted for it is ignored and its cell is left for the
    /// formula service to fill.
    /// </summary>
    private void ApplyValues(Dataset dataset, DatasetRow row, Dictionary<Guid, string> values)
    {
        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);

        foreach (var (columnRef, raw) in values)
        {
            if (!columnsByRef.TryGetValue(columnRef, out var column) || column.IsComputed)
            {
                continue;
            }

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
        var computedIds = dataset.Columns.Where(c => c.IsComputed).Select(c => c.Id).ToHashSet();
        var dropped = row.Cells.Where(c => !submittedPks.Contains(c.ColumnId) && !computedIds.Contains(c.ColumnId)).ToList();
        foreach (var cell in dropped)
        {
            row.Cells.Remove(cell);
            db.DatasetCells.Remove(cell);
        }
    }
}
