namespace Reporting.DAL.Formulas.Evaluation;

/// <summary>
/// What each operator does with values. A blank on either side gives a blank, except for <c>&amp;</c>, which
/// treats blanks as empty text. A division by zero is a blank result rather than an error, so a guarded
/// <c>IF([Qty] = 0, 0, [Total] / [Qty])</c> works even though every branch is evaluated.
/// </summary>
public static class FormulaOperators
{
    public static object? Negate(string op, object? operand)
    {
        if (operand is null)
        {
            return null;
        }

        var number = AsNumber(operand);
        return op == "-" ? -number : number;
    }

    public static object? Apply(string op, object? left, object? right)
    {
        if (op == "&")
        {
            return FormulaValueText.ToText(left) + FormulaValueText.ToText(right);
        }

        if (left is null || right is null)
        {
            return null;
        }

        switch (op)
        {
            case "=":
            case "<>":
            case "<":
            case "<=":
            case ">":
            case ">=":
                return Compare(op, left, right);
            default:
                return Arithmetic(op, AsNumber(left), AsNumber(right));
        }
    }

    private static object Compare(string op, object left, object right)
    {
        switch (op)
        {
            case "=":
                return FormulaValueComparison.AreEqual(left, right);
            case "<>":
                return !FormulaValueComparison.AreEqual(left, right);
            case "<":
                return FormulaValueComparison.Compare(left, right) < 0;
            case "<=":
                return FormulaValueComparison.Compare(left, right) <= 0;
            case ">":
                return FormulaValueComparison.Compare(left, right) > 0;
            default:
                return FormulaValueComparison.Compare(left, right) >= 0;
        }
    }

    private static object? Arithmetic(string op, double left, double right)
    {
        switch (op)
        {
            case "+":
                return left + right;
            case "-":
                return left - right;
            case "*":
                return left * right;
            case "/":
                return right == 0 ? null : left / right;
            case "%":
                return right == 0 ? null : left - right * Math.Floor(left / right);
            case "^":
                return Math.Pow(left, right);
            default:
                throw new FormulaEvaluationException($"Unknown operator '{op}'.");
        }
    }

    private static double AsNumber(object value)
    {
        if (value is double number)
        {
            return number;
        }

        throw new FormulaEvaluationException($"Expected a number but found {FormulaValueText.Describe(value)}.");
    }
}
