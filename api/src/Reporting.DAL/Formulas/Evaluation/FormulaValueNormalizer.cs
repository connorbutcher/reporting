namespace Reporting.DAL.Formulas.Evaluation;

public static class FormulaValueNormalizer
{
    /// <summary>NaN and infinities (from things like a huge POWER) become blank rather than poisoning a cell.</summary>
    public static object? Normalize(object? value)
    {
        if (value is double number && !double.IsFinite(number))
        {
            return null;
        }

        return value;
    }
}
