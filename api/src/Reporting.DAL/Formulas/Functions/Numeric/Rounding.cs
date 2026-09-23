namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>Shared by the ROUND family.</summary>
internal static class Rounding
{
    /// <summary>
    /// Rounds in decimal so 1.1 * 10 doesn't round up to 12 through floating-point noise; negative digits
    /// round to tens, hundreds, and so on. Numbers too large for decimal have no fractional part to round.
    /// </summary>
    public static double RoundTo(double value, int digits, MidpointRounding mode)
    {
        if (Math.Abs(value) >= 1e15) return value;

        var number = (decimal)value;
        if (digits >= 0) return (double)Math.Round(number, Math.Min(digits, 15), mode);

        var scale = 1m;
        for (var i = 0; i < Math.Min(-digits, 15); i++) scale *= 10;
        return (double)(Math.Round(number / scale, 0, mode) * scale);
    }
}
