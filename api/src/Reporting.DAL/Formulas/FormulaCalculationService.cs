using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Formulas.Catalogue;
using Reporting.DAL.Formulas.Planning;
using Reporting.Database;

namespace Reporting.DAL.Formulas;

/// <summary>
/// The service that runs formula columns. It builds a <see cref="FormulaPlan"/> from a dataset's columns and the
/// function catalogue in the database, and writes each computed value into its cell like any typed value — so
/// filters, charts, tolerances and pivots see an ordinary column and need no knowledge of formulas.
/// Calculation is synchronous, inside the request that changed the data.
/// </summary>
public class FormulaCalculationService(ReportingDbContext db, FormulaFunctionCatalogueLoader catalogueLoader)
{
    private const int BatchSize = 500;

    private readonly FormulaCellWriter _writer = new(db);
    private readonly FormulaPreviewBuilder _previews = new(db);

    public async Task<FormulaFunctionCatalogue> GetCatalogueAsync()
    {
        return await catalogueLoader.GetAsync();
    }

    /// <summary>Checks the dataset's computed columns and puts them in dependency order.</summary>
    public async Task<FormulaPlan> PlanAsync(IReadOnlyCollection<DatasetColumn> columns)
    {
        var catalogue = await catalogueLoader.GetAsync();
        return FormulaPlan.Build(columns, catalogue);
    }

    /// <summary>Checks an unsaved formula and evaluates it against the first rows of the dataset, without changing anything.</summary>
    public async Task<FormulaPreviewDto> PreviewAsync(Dataset dataset, string expression, DatasetColumnType? type, int sampleSize)
    {
        var catalogue = await catalogueLoader.GetAsync();
        return await _previews.BuildAsync(dataset, expression, type, sampleSize, catalogue);
    }

    /// <summary>
    /// Fills a row's computed cells from its other cells. Called after a row's typed values change and before
    /// the caller saves; <paramref name="row"/> must have its cells loaded.
    /// </summary>
    public async Task ApplyToRowAsync(Dataset dataset, DatasetRow row)
    {
        if (!HasComputedColumns(dataset))
        {
            return;
        }

        var plan = await PlanAsync(dataset.Columns);
        _writer.Write(row, plan.Evaluate(row));
    }

    /// <summary>
    /// Re-checks every computed column of a dataset and recomputes every row. Records each column's
    /// <see cref="DatasetColumn.FormulaError"/> (clearing it when healthy) and empties the cells of columns that
    /// can't run. Run after anything that can change a formula's meaning: a column added, retyped or removed,
    /// a formula edited, or the function catalogue changed. <paramref name="dataset"/> must have its columns loaded.
    /// </summary>
    public async Task RecalculateAsync(Dataset dataset)
    {
        if (!HasComputedColumns(dataset))
        {
            return;
        }

        var plan = await PlanAsync(dataset.Columns);
        await RecordErrorsAsync(plan);
        await ClearBrokenCellsAsync(plan);

        if (plan.Runnable.Count > 0)
        {
            await RecomputeRowsAsync(dataset.Id, plan);
        }
    }

    private static bool HasComputedColumns(Dataset dataset)
    {
        foreach (var column in dataset.Columns)
        {
            if (column.IsComputed)
            {
                return true;
            }
        }

        return false;
    }

    private async Task RecordErrorsAsync(FormulaPlan plan)
    {
        foreach (var planned in plan.Columns)
        {
            planned.Column.FormulaError = planned.Error;
        }

        await db.SaveChangesAsync();
    }

    /// <summary>A column that can't run leaves no stale values behind.</summary>
    private async Task ClearBrokenCellsAsync(FormulaPlan plan)
    {
        var brokenIds = new List<int>();
        foreach (var planned in plan.Columns)
        {
            if (!planned.IsValid && planned.Column.Id != 0)
            {
                brokenIds.Add(planned.Column.Id);
            }
        }

        if (brokenIds.Count > 0)
        {
            await db.DatasetCells.Where(c => brokenIds.Contains(c.ColumnId)).ExecuteDeleteAsync();
        }
    }

    /// <summary>
    /// Recomputes every row in batches, walking the rows by id (not by offset, which would rescan the table
    /// for each batch) and letting go of each batch once saved so a large dataset doesn't pile up in memory.
    /// </summary>
    private async Task RecomputeRowsAsync(int datasetId, FormulaPlan plan)
    {
        var lastId = 0;
        while (true)
        {
            var afterLast = lastId;
            var rows = await db.DatasetRows
                .Where(r => r.DatasetId == datasetId && r.Id > afterLast)
                .OrderBy(r => r.Id)
                .Take(BatchSize)
                .Include(r => r.Cells)
                .ToListAsync();
            if (rows.Count == 0)
            {
                return;
            }

            foreach (var row in rows)
            {
                _writer.Write(row, plan.Evaluate(row));
            }

            await db.SaveChangesAsync();
            lastId = rows[^1].Id;
            Detach(rows);
        }
    }

    private void Detach(List<DatasetRow> rows)
    {
        foreach (var row in rows)
        {
            foreach (var cell in row.Cells)
            {
                db.Entry(cell).State = EntityState.Detached;
            }

            db.Entry(row).State = EntityState.Detached;
        }
    }
}
