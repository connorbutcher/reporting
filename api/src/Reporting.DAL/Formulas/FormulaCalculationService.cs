using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Formulas.Catalogue;
using Reporting.DAL.Formulas.Planning;
using Reporting.Database;

namespace Reporting.DAL.Formulas;

/// <summary>
/// Runs formula columns, writing each computed value into its cell like any typed value, so everything
/// downstream sees an ordinary column. Runs synchronously inside the request that changed the data.
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

    /// <summary>Before the caller saves. <paramref name="row"/> must have its cells loaded.</summary>
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
    /// Records each column's <see cref="DatasetColumn.FormulaError"/> and empties columns that can't run.
    /// Run after anything that can change a formula's meaning. <paramref name="dataset"/> must have its columns loaded.
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

    /// <summary>Batches walk by id rather than offset, and each is released once saved.</summary>
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
