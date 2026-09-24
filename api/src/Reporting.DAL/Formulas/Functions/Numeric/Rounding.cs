namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>Shared by the ROUND family.</summary>
internal static class Rounding
{
    private const double LargestRoundable = 1e15;
    private const int MostDecimalPlaces = 15;

    /// <summary>
    /// Rounds in decimal so 1.1 * 10 doesn't round up to 12 through floating-point noise; negative digits
    /// round to tens, hundreds, and so on. Numbers too large for decimal have no fractional part to round.
    /// </summary>
    public static double RoundTo(double value, int digits, MidpointRounding mode)
    {
        if (Math.Abs(value) >= LargestRoundable)
        {
            return value;
        }

        var number = (decimal)value;
        if (digits >= 0)
        {
            return (double)Math.Round(number, Math.Min(digits, MostDecimalPlaces), mode);
        }

        var scale = PowerOfTen(Math.Min(-digits, MostDecimalPlaces));
        return (double)(Math.Round(number / scale, 0, mode) * scale);
    }

    private static decimal PowerOfTen(int exponent)
    {
        var scale = 1m;
        for (var i = 0; i < exponent; i++)
        {
            scale *= 10;
        }

        return scale;
    }
}
