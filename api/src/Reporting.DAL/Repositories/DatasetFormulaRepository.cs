using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Formulas;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// Formula column CRUD and the builder's live preview. Kept separate from <see cref="DatasetRepository"/>
/// (which still owns plain column CRUD and calls back into <see cref="ReconcileAfterColumnChangedAsync"/>
/// when a plain column's rename/retype needs to keep dependent formulas in step) since this is a
/// distinct concern with its own validate/cycle-check/recompute pipeline, built on the pure logic in
/// <c>Reporting.DAL.Formulas</c>.
/// </summary>
public class DatasetFormulaRepository(ReportingDbContext db)
{
    /// <summary>Adds a computed column: validates the formula against the dataset's current schema,
    /// checks it doesn't create a dependency cycle, then computes and stores every row's value.</summary>
    public async Task<DatasetColumnDto?> AddFormulaColumnAsync(int id, string name, DatasetColumnType resultType, string expression)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        FormulaValidator.Validate(expression, resultType, dataset.Columns, editingColumnRef: null);

        var column = new DatasetColumn
        {
            RefId = Guid.NewGuid(),
            Name = name,
            Type = resultType,
            Order = dataset.Columns.Count == 0 ? 0 : dataset.Columns.Max(c => c.Order) + 1,
            IsComputed = true,
            FormulaExpression = expression,
        };
        dataset.Columns.Add(column);

        // Cycle check across the whole dataset now the new column is part of it — before anything is saved.
        FormulaDependencyGraph.TopologicalOrder(FormulaDependencyGraph.Build(dataset.Columns));

        await db.SaveChangesAsync();
        await RecomputeAllRowsAsync(dataset);
        return column.ToDto();
    }

    /// <summary>Edits an existing formula column's name, result type and/or expression. Re-validates
    /// and re-checks for cycles exactly as <see cref="AddFormulaColumnAsync"/> does, then recomputes
    /// every row (the whole dataset's formula set, not just this column — a chained dependent needs
    /// to see the change too).</summary>
    public async Task<DatasetColumnDto?> UpdateFormulaAsync(int id, Guid columnId, string name, DatasetColumnType resultType, string expression)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        var column = dataset?.Columns.FirstOrDefault(c => c.RefId == columnId);
        if (dataset is null || column is null) return null;

        if (!column.IsComputed)
            throw new DataValidationException("This column isn't a formula column.");

        FormulaValidator.Validate(expression, resultType, dataset.Columns, editingColumnRef: columnId);

        var oldName = column.Name;
        column.Name = name;
        column.Type = resultType;
        column.FormulaExpression = expression;
        column.FormulaHasError = false;
        column.FormulaError = null;

        FormulaDependencyGraph.TopologicalOrder(FormulaDependencyGraph.Build(dataset.Columns));

        await db.SaveChangesAsync();

        if (oldName != column.Name) await ReconcileAfterColumnChangedAsync(dataset, oldName, column.Name);
        else await RecomputeAllRowsAsync(dataset);

        return column.ToDto();
    }

    /// <summary>
    /// Evaluates a not-yet-saved formula against a sample of the dataset's existing rows, for the
    /// formula builder's live preview — nothing is persisted. Returns a top-level <c>Error</c> if the
    /// formula doesn't even validate; otherwise one result (value or per-row error) per sampled row.
    /// Null when the dataset doesn't exist.
    /// </summary>
    public async Task<FormulaPreviewResultDto?> PreviewFormulaAsync(
        int id,
        DatasetColumnType resultType,
        string expression,
        Guid? editingColumnId,
        int sampleSize = 20)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        FormulaValidationResult validated;
        try
        {
            validated = FormulaValidator.Validate(expression, resultType, dataset.Columns, editingColumnId);
        }
        catch (Exception ex) when (ex is FormulaParseException or FormulaValidationException)
        {
            return new FormulaPreviewResultDto { Error = ex.Message };
        }

        var rows = await db.DatasetRows
            .Where(r => r.DatasetId == id)
            .OrderBy(r => r.Id)
            .Take(Math.Clamp(sampleSize, 1, 100))
            .Include(r => r.Cells)
            .ToListAsync();

        var preview = new FormulaPreviewResultDto();
        foreach (var row in rows)
        {
            var valuesByName = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            foreach (var column in dataset.Columns)
                valuesByName[column.Name] = FormulaRecompute.CellValueOf(row.Cells.FirstOrDefault(c => c.ColumnId == column.Id), column.Type);

            try
            {
                var value = FormulaEvaluator.Evaluate(validated.Ast, valuesByName);
                preview.Rows.Add(new FormulaPreviewRowDto { RowId = row.RefId, Value = FormulaRecompute.FormatValue(value) });
            }
            catch (FormulaEvaluationException ex)
            {
                preview.Rows.Add(new FormulaPreviewRowDto { RowId = row.RefId, Error = ex.Message });
            }
        }
        return preview;
    }

    /// <summary>
    /// Called by <see cref="DatasetRepository"/> after a plain (or formula) column's name changes:
    /// rewrites `[oldName]` references to the new name, then re-validates every computed column
    /// against the dataset's current schema (a retype can invalidate a dependent's arithmetic even
    /// without a rename) and recomputes. A formula that no longer holds together is flagged via
    /// <see cref="DatasetColumn.FormulaHasError"/> rather than rejecting the change that broke it —
    /// the column being renamed/retyped isn't the one at fault.
    /// </summary>
    public async Task ReconcileAfterColumnChangedAsync(Dataset dataset, string oldName, string newName)
    {
        if (oldName != newName) FormulaColumnRename.RenameReferences(dataset.Columns, oldName, newName);

        foreach (var column in dataset.Columns.Where(c => c.IsComputed && !string.IsNullOrWhiteSpace(c.FormulaExpression)))
        {
            try
            {
                FormulaValidator.Validate(column.FormulaExpression!, column.Type, dataset.Columns, editingColumnRef: column.RefId);
                column.FormulaHasError = false;
                column.FormulaError = null;
            }
            catch (Exception ex) when (ex is FormulaParseException or FormulaValidationException)
            {
                column.FormulaHasError = true;
                column.FormulaError = ex.Message;
            }
        }

        await db.SaveChangesAsync();
        await RecomputeAllRowsAsync(dataset);
    }

    /// <summary>Recomputes and saves every formula column's cells for every row in the dataset.
    /// Assumes <see cref="Dataset.Columns"/> is loaded; a no-op if the dataset has no (working)
    /// formula columns.</summary>
    private async Task RecomputeAllRowsAsync(Dataset dataset)
    {
        var ordered = FormulaRecompute.PrepareOrderedFormulas(dataset.Columns);
        if (ordered.Count == 0) return;

        var rows = await db.DatasetRows.Where(r => r.DatasetId == dataset.Id).Include(r => r.Cells).ToListAsync();
        foreach (var row in rows) FormulaRecompute.Row(row, ordered, dataset.Columns);
        await db.SaveChangesAsync();
    }
}
