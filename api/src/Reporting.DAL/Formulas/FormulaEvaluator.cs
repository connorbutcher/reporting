using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Formulas;

/// <summary>
/// Runs a checked formula for one row. Blank (null) propagates through operators; a function's own
/// definition says whether it propagates through calls (<c>PropagatesNull</c>) or handles blanks itself.
/// Arguments are checked against the definition's parameter kinds before the implementation runs.
/// A division by zero, like a square root of a negative, is a blank result rather than an error, so a
/// guarded <c>IF([Qty] = 0, 0, [Total] / [Qty])</c> works even though every branch is evaluated.
/// </summary>
public sealed class FormulaEvaluator(FormulaFunctionCatalogue catalogue)
{
    /// <param name="readColumn">Supplies a column's typed value for the current row (null when blank).</param>
    /// <exception cref="FormulaEvaluationException">The formula can't be evaluated for this row.</exception>
    public object? Evaluate(FormulaAnalysis analysis, Func<DatasetColumn, object?> readColumn)
    {
        if (analysis.Root is null) throw new FormulaEvaluationException("The formula isn't valid.");

        return FormulaValues.Normalize(Eval(analysis.Root, analysis, readColumn));
    }

    private object? Eval(FormulaNode node, FormulaAnalysis analysis, Func<DatasetColumn, object?> read)
    {
        switch (node)
        {
            case NumberNode n: return n.Value;
            case TextNode t: return t.Value;
            case BoolNode b: return b.Value;
            case NullNode: return null;
            case ColumnNode c: return read(analysis.Bindings[c]);
            case UnaryNode u: return Unary(u, Eval(u.Operand, analysis, read));
            case BinaryNode b:
                return Binary(b.Operator, Eval(b.Left, analysis, read), Eval(b.Right, analysis, read));
            case CallNode call: return Call(call, analysis, read);
            default: throw new FormulaEvaluationException("Unsupported expression.");
        }
    }

    private static object? Unary(UnaryNode node, object? operand)
    {
        if (operand is null) return null;
        var number = AsNumber(operand);
        return node.Operator == "-" ? -number : number;
    }

    private static object? Binary(string op, object? left, object? right)
    {
        if (op == "&") return FormulaValues.ToText(left) + FormulaValues.ToText(right);
        if (left is null || right is null) return null;

        switch (op)
        {
            case "=": return FormulaValues.AreEqual(left, right);
            case "<>": return !FormulaValues.AreEqual(left, right);
            case "<": return FormulaValues.Compare(left, right) < 0;
            case "<=": return FormulaValues.Compare(left, right) <= 0;
            case ">": return FormulaValues.Compare(left, right) > 0;
            case ">=": return FormulaValues.Compare(left, right) >= 0;
        }

        var a = AsNumber(left);
        var b = AsNumber(right);
        return op switch
        {
            "+" => a + b,
            "-" => a - b,
            "*" => a * b,
            "/" => b == 0 ? null : a / b,
            "%" => b == 0 ? null : a - b * Math.Floor(a / b),
            "^" => Math.Pow(a, b),
            _ => throw new FormulaEvaluationException($"Unknown operator '{op}'.")
        };
    }

    private static double AsNumber(object value) =>
        value is double d ? d : throw new FormulaEvaluationException($"Expected a number but found {FormulaValues.Describe(value)}.");

    private object? Call(CallNode call, FormulaAnalysis analysis, Func<DatasetColumn, object?> read)
    {
        var function = catalogue.Find(call.Name)
            ?? throw new FormulaEvaluationException(catalogue.WhyUnavailable(call.Name) ?? $"There's no function named {call.Name}.");

        var args = new object?[call.Arguments.Count];
        for (var i = 0; i < args.Length; i++)
        {
            args[i] = Eval(call.Arguments[i], analysis, read);

            var parameter = function.ParameterFor(i);
            if (!FormulaValues.Matches(args[i], parameter.Kind))
            {
                throw new FormulaEvaluationException(
                    $"{function.Name}'s '{parameter.Name}' needs {KindText(parameter.Kind)} but found {FormulaValues.Describe(args[i])}.");
            }
        }

        if (function.Definition.PropagatesNull && args.Any(a => a is null)) return null;

        return function.Implementation.Invoke(args);
    }

    private static string KindText(FormulaValueKind kind) => kind switch
    {
        FormulaValueKind.Number => "a number",
        FormulaValueKind.Text => "text",
        FormulaValueKind.Bool => "a true/false value",
        FormulaValueKind.Date => "a date",
        _ => "a value"
    };
}
