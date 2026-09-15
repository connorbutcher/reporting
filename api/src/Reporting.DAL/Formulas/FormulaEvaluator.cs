using Reporting.DAL.Formulas.Ast;
using Reporting.DAL.Formulas.Functions;

namespace Reporting.DAL.Formulas;

/// <summary>
/// Tree-walking evaluator: a <see cref="FormulaNode"/> plus one row's column values (by name,
/// case-insensitive) in, a boxed <c>double?/bool?/DateTime?/string?</c> out. Null propagates through
/// arithmetic, comparisons and ordinary function calls (any null argument makes the whole call
/// null) — a formula referencing an empty cell reads as empty, not a misleading zero. AND/OR/NOT and
/// IF use SQL-style three-valued logic instead, so <c>[A] AND FALSE</c> is still <c>FALSE</c> even
/// when <c>[A]</c> is blank. A shape mismatch (arithmetic on text, an unknown function/column) throws
/// <see cref="FormulaEvaluationException"/> — always caught by the caller and turned into a null
/// result for that one row, never allowed to fail a whole recompute.
/// </summary>
public static class FormulaEvaluator
{
    public static object? Evaluate(FormulaNode node, IReadOnlyDictionary<string, object?> valuesByColumnName) => node switch
    {
        NumberLiteral n => n.Value,
        StringLiteral s => s.Value,
        BoolLiteral b => b.Value,
        ColumnReference c => valuesByColumnName.GetValueOrDefault(c.ColumnName),
        UnaryOperation u => EvaluateUnary(u, valuesByColumnName),
        BinaryOperation b => EvaluateBinary(b, valuesByColumnName),
        FunctionCall f => EvaluateCall(f, valuesByColumnName),
        _ => throw new FormulaEvaluationException("Unrecognised formula node."),
    };

    private static object? EvaluateUnary(UnaryOperation node, IReadOnlyDictionary<string, object?> values)
    {
        var operand = Evaluate(node.Operand, values);
        if (operand is null) return null;

        return node.Operator switch
        {
            "-" => -FormulaValues.ToNumber(operand),
            "NOT" => !FormulaValues.ToBool(operand),
            _ => throw new FormulaEvaluationException($"Unknown unary operator '{node.Operator}'."),
        };
    }

    private static object? EvaluateBinary(BinaryOperation node, IReadOnlyDictionary<string, object?> values)
    {
        // Three-valued logic: these short-circuit and evaluate their own operands, rather than
        // sharing the "any null in, null out" rule the rest of this method uses.
        if (node.Operator == "AND") return EvaluateAnd(node, values);
        if (node.Operator == "OR") return EvaluateOr(node, values);

        var left = Evaluate(node.Left, values);
        var right = Evaluate(node.Right, values);
        if (left is null || right is null) return null;

        return node.Operator switch
        {
            "+" => FormulaValues.ToNumber(left) + FormulaValues.ToNumber(right),
            "-" => FormulaValues.ToNumber(left) - FormulaValues.ToNumber(right),
            "*" => FormulaValues.ToNumber(left) * FormulaValues.ToNumber(right),
            "/" => Divide(FormulaValues.ToNumber(left), FormulaValues.ToNumber(right)),
            "=" => AreEqual(left, right),
            "<>" => !AreEqual(left, right),
            "<" => Compare(left, right) < 0,
            "<=" => Compare(left, right) <= 0,
            ">" => Compare(left, right) > 0,
            ">=" => Compare(left, right) >= 0,
            _ => throw new FormulaEvaluationException($"Unknown operator '{node.Operator}'."),
        };
    }

    private static double Divide(double left, double right)
    {
        if (right == 0) throw new FormulaEvaluationException("Division by zero.");
        return left / right;
    }

    /// <summary>FALSE AND anything is FALSE even when the other side is blank — matches SQL, not C#.</summary>
    private static object? EvaluateAnd(BinaryOperation node, IReadOnlyDictionary<string, object?> values)
    {
        var left = Evaluate(node.Left, values);
        if (left is bool { } lb && !lb) return false;

        var right = Evaluate(node.Right, values);
        if (right is bool { } rb && !rb) return false;

        if (left is null || right is null) return null;
        return FormulaValues.ToBool(left) && FormulaValues.ToBool(right);
    }

    /// <summary>TRUE OR anything is TRUE even when the other side is blank.</summary>
    private static object? EvaluateOr(BinaryOperation node, IReadOnlyDictionary<string, object?> values)
    {
        var left = Evaluate(node.Left, values);
        if (left is bool { } lb && lb) return true;

        var right = Evaluate(node.Right, values);
        if (right is bool { } rb && rb) return true;

        if (left is null || right is null) return null;
        return FormulaValues.ToBool(left) || FormulaValues.ToBool(right);
    }

    private static bool AreEqual(object left, object right) => (left, right) switch
    {
        (double l, double r) => l.Equals(r),
        (bool l, bool r) => l == r,
        (DateTime l, DateTime r) => l == r,
        (string l, string r) => string.Equals(l, r, StringComparison.Ordinal),
        _ => throw new FormulaEvaluationException($"Can't compare a {left.GetType().Name} with a {right.GetType().Name}."),
    };

    private static int Compare(object left, object right) => (left, right) switch
    {
        (double l, double r) => l.CompareTo(r),
        (DateTime l, DateTime r) => l.CompareTo(r),
        (string l, string r) => string.CompareOrdinal(l, r),
        _ => throw new FormulaEvaluationException($"Can't order {left.GetType().Name} values with '<'/'>'."),
    };

    private static object? EvaluateCall(FunctionCall node, IReadOnlyDictionary<string, object?> values)
    {
        if (string.Equals(node.Name, "IF", StringComparison.OrdinalIgnoreCase))
            return EvaluateIf(node, values);

        if (!FormulaFunctions.All.TryGetValue(node.Name, out var def))
            throw new FormulaEvaluationException($"Unknown function '{node.Name}'.");

        if (node.Arguments.Count < def.MinArgs || node.Arguments.Count > def.MaxArgs)
            throw new FormulaEvaluationException($"'{node.Name}' takes {ArityText(def)}, not {node.Arguments.Count}.");

        var args = node.Arguments.Select(a => Evaluate(a, values)).ToList();
        return args.Any(a => a is null) ? null : def.Invoke(args);
    }

    private static object? EvaluateIf(FunctionCall node, IReadOnlyDictionary<string, object?> values)
    {
        if (node.Arguments.Count != 3)
            throw new FormulaEvaluationException($"'IF' takes 3 arguments (condition, then, else), not {node.Arguments.Count}.");

        var condition = Evaluate(node.Arguments[0], values);
        if (condition is null) return null;
        return FormulaValues.ToBool(condition) ? Evaluate(node.Arguments[1], values) : Evaluate(node.Arguments[2], values);
    }

    private static string ArityText(IFormulaFunction def) =>
        def.MinArgs == def.MaxArgs
            ? $"{def.MinArgs} argument{(def.MinArgs == 1 ? "" : "s")}"
            : $"{def.MinArgs} to {def.MaxArgs} arguments";
}
