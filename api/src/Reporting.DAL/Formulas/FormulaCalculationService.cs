using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
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
    private const int MaxPreviewRows = 50;

    public async Task<FormulaFunctionCatalogue> GetCatalogueAsync() => await catalogueLoader.GetAsync();

    /// <summary>Checks the dataset's computed columns and puts them in dependency order.</summary>
    public async Task<FormulaPlan> PlanAsync(IReadOnlyCollection<DatasetColumn> columns) =>
        FormulaPlan.Build(columns, await catalogueLoader.GetAsync());

    /// <summary>
    /// Checks an unsaved formula and evaluates it against the first rows of the dataset, without changing anything.
    /// With no declared type, the type is the one the formula naturally produces (text when that can't be told).
    /// </summary>
    public async Task<FormulaPreviewDto> PreviewAsync(Dataset dataset, string expression, DatasetColumnType? type, int sampleSize)
    {
        var catalogue = await catalogueLoader.GetAsync();
        var analysis = FormulaAnalyzer.Analyze(expression, dataset.Columns, catalogue, type);

        var preview = new FormulaPreviewDto
        {
            IsValid = analysis.IsValid,
            Errors = analysis.Errors.ToList(),
            InferredType = analysis.IsValid ? FormulaValues.NaturalColumnType(analysis.ResultKind) : null
        };
        if (!analysis.IsValid) return preview;

        // Plan it as a real column (so a dependency on a broken formula column is caught), but never attach it.
        var candidate = new DatasetColumn
        {
            Name = "\0preview",
            Type = type ?? preview.InferredType ?? DatasetColumnType.String,
            FormulaExpression = expression
        };
        var plan = FormulaPlan.Build([.. dataset.Columns, candidate], catalogue);
        var planned = plan.For(candidate)!;
        if (!planned.IsValid)
        {
            preview.IsValid = false;
            preview.Errors.Add(new FormulaErrorDto { Message = planned.Error!, Position = 0, Length = expression.Length });
            return preview;
        }

        var rows = await db.DatasetRows
            .AsNoTracking()
            .Where(r => r.DatasetId == dataset.Id)
            .OrderBy(r => r.Id)
            .Take(Math.Clamp(sampleSize, 1, MaxPreviewRows))
            .Include(r => r.Cells)
            .ToListAsync();

        var inputs = planned.Analysis.References.Where(c => c.Id != 0).OrderBy(c => c.Order).ToList();
        preview.InputColumns = inputs.Select(c => c.Name).ToList();

        foreach (var row in rows)
        {
            var outcome = plan.Evaluate(row)[candidate];
            var cells = row.Cells.GroupBy(c => c.ColumnId).ToDictionary(g => g.Key, g => g.First());
            preview.Rows.Add(new FormulaPreviewRowDto
            {
                RowId = row.RefId,
                Value = FormulaValues.ToCellText(outcome.Value, candidate.Type),
                Error = outcome.Error,
                Inputs = inputs.ToDictionary(
                    c => c.Name,
                    c => cells.TryGetValue(c.Id, out var cell) && !string.IsNullOrWhiteSpace(cell.StringValue) ? cell.StringValue : null)
            });
        }

        return preview;
    }

    /// <summary>
    /// Fills a row's computed cells from its other cells. Called after a row's typed values change and before
    /// the caller saves; <paramref name="row"/> must have its cells loaded.
    /// </summary>
    public async Task ApplyToRowAsync(Dataset dataset, DatasetRow row)
    {
        if (!dataset.Columns.Any(c => c.IsComputed)) return;

        var plan = await PlanAsync(dataset.Columns);
        WriteOutcomes(row, plan.Evaluate(row));
    }

    /// <summary>
    /// Re-checks every computed column of a dataset and recomputes every row. Records each column's
    /// <see cref="DatasetColumn.FormulaError"/> (clearing it when healthy) and empties the cells of columns that
    /// can't run. Run after anything that can change a formula's meaning: a column added, retyped or removed,
    /// a formula edited, or the function catalogue changed. <paramref name="dataset"/> must have its columns loaded.
    /// </summary>
    public async Task RecalculateAsync(Dataset dataset)
    {
        if (!dataset.Columns.Any(c => c.IsComputed)) return;

        var plan = await PlanAsync(dataset.Columns);
        foreach (var planned in plan.Columns) planned.Column.FormulaError = planned.Error;
        await db.SaveChangesAsync();

        var brokenIds = plan.Columns.Where(c => !c.IsValid && c.Column.Id != 0).Select(c => c.Column.Id).ToList();
        if (brokenIds.Count > 0)
            await db.DatasetCells.Where(c => brokenIds.Contains(c.ColumnId)).ExecuteDeleteAsync();

        if (!plan.Runnable.Any()) return;

        for (var first = 0; ; first += BatchSize)
        {
            var rows = await db.DatasetRows
                .Where(r => r.DatasetId == dataset.Id)
                .OrderBy(r => r.Id)
                .Skip(first)
                .Take(BatchSize)
                .Include(r => r.Cells)
                .ToListAsync();
            if (rows.Count == 0) break;

            foreach (var row in rows) WriteOutcomes(row, plan.Evaluate(row));
            await db.SaveChangesAsync();

            // Done with this batch: stop tracking it so a large dataset doesn't accumulate in memory.
            foreach (var row in rows)
            {
                foreach (var cell in row.Cells) db.Entry(cell).State = EntityState.Detached;
                db.Entry(row).State = EntityState.Detached;
            }
        }
    }

    private void WriteOutcomes(DatasetRow row, Dictionary<DatasetColumn, FormulaOutcome> outcomes)
    {
        foreach (var (column, outcome) in outcomes)
        {
            var raw = FormulaValues.ToCellText(outcome.Value, column.Type);
            var cell = row.Cells.FirstOrDefault(c => c.ColumnId == column.Id);

            if (raw is null)
            {
                if (cell is null) continue;
                row.Cells.Remove(cell);
                db.DatasetCells.Remove(cell);
            }
            else if (cell is null)
            {
                row.Cells.Add(CellValues.Create(column.Id, raw, column.Type));
            }
            else
            {
                CellValues.Apply(cell, raw, column.Type);
            }
        }
    }
}
