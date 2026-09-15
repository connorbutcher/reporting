using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

/// <summary>Shared argument-checking used by more than one text function.</summary>
internal static class TextFunctions
{
    public static int NonNegativeCount(string functionName, object? value)
    {
        var count = FormulaValues.ToNumber(value);
        if (count < 0 || count != Math.Floor(count))
            throw new FormulaEvaluationException($"'{functionName}'s count argument must be a non-negative whole number.");
        return (int)count;
    }
}
