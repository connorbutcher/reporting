using System.Globalization;
using Reporting.Abstractions;
using Reporting.DAL.Formulas.Ast;
using Reporting.Database;

namespace Reporting.DAL.Formulas;

/// <summary>
/// Turns a dataset's computed columns and a row's other cell values into freshly-computed formula
/// cells, written through <see cref="CellValues"/> exactly as a manually-typed value would be. Pure —
/// mutates only the in-memory <see cref="DatasetRow"/> it's given; callers (<c>DatasetFormulaRepository</c>,
/// <c>DatasetRowRepository</c>) own the database query and <c>SaveChangesAsync</c>.
/// </summary>
public static class FormulaRecompute
{
    /// <summary>Every computed column, parsed once and dependency-ordered — the shape
    /// <see cref="Row"/> needs for a whole recompute pass. A column with no expression, or one
    /// already flagged <see cref="DatasetColumn.FormulaHasError"/>, is skipped: its cell is left as
    /// whatever it last held rather than being blanked out by an unrelated recompute.</summary>
    public static List<(DatasetColumn Column, FormulaNode Ast)> PrepareOrderedFormulas(IReadOnlyList<DatasetColumn> columns)
    {
        var order = FormulaDependencyGraph.TopologicalOrder(FormulaDependencyGraph.Build(columns));
        var byRef = columns.ToDictionary(c => c.RefId);

        var prepared = new List<(DatasetColumn, FormulaNode)>();
        foreach (var refId in order)
        {
            var column = byRef[refId];
            if (column.FormulaHasError || string.IsNullOrWhiteSpace(column.FormulaExpression)) continue;
            try
            {
                prepared.Add((column, FormulaParser.Parse(column.FormulaExpression)));
            }
            catch (FormulaParseException)
            {
                // Shouldn't happen for a formula that passed FormulaValidator.Validate at save time,
                // but stay defensive rather than take a whole recompute down over one bad column.
            }
        }
        return prepared;
    }

    /// <summary>Recomputes every formula column's cell for one row, in dependency order. Mutates
    /// <paramref name="row"/>'s cells in place; the caller decides when to <c>SaveChangesAsync</c>.</summary>
    public static void Row(
        DatasetRow row,
        IReadOnlyList<(DatasetColumn Column, FormulaNode Ast)> orderedFormulas,
        IReadOnlyList<DatasetColumn> allColumns)
    {
        var valuesByName = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        foreach (var column in allColumns)
            valuesByName[column.Name] = CellValueOf(row.Cells.FirstOrDefault(c => c.ColumnId == column.Id), column.Type);

        foreach (var (column, ast) in orderedFormulas)
        {
            object? result;
            try
            {
                result = FormulaEvaluator.Evaluate(ast, valuesByName);
            }
            catch (FormulaEvaluationException)
            {
                result = null; // this row's cell goes blank; the formula itself isn't flagged broken over one row
            }

            var raw = FormatValue(result);
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

            valuesByName[column.Name] = CellValueOf(cell, column.Type);
        }
    }

    public static object? CellValueOf(DatasetCell? cell, DatasetColumnType type)
    {
        if (cell is null) return null;
        return type switch
        {
            DatasetColumnType.Int or DatasetColumnType.Double => cell.NumberValue,
            DatasetColumnType.Bool => cell.BoolValue,
            DatasetColumnType.DateTime => cell.DateValue,
            _ => cell.StringValue,
        };
    }

    /// <summary>A formula result in the same canonical-text form <see cref="CellValues"/> stores and
    /// re-parses everywhere else, so a computed cell is indistinguishable from a typed-in one.</summary>
    public static string? FormatValue(object? value) => value switch
    {
        null => null,
        double d => d.ToString("R", CultureInfo.InvariantCulture),
        bool b => b.ToString(),
        DateTime dt => dt.ToString("O", CultureInfo.InvariantCulture),
        string s => s,
        _ => value.ToString(),
    };
}
