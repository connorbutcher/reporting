namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>Shared by the ROUND family.</summary>
internal static class Rounding
{
    private const double LargestRoundable = 1e15;
    private const int MostDecimalPlaces = 15;
    private const double SmallestMultiple = 1e-15;

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

    /// <summary>
    /// Rounds to the nearest multiple (a positive number), halves away from zero, in decimal for the same reason
    /// as <see cref="RoundTo"/>; a multiple too small for decimal, or too many
    /// multiples to count in it, falls back to floating point.
    /// </summary>
    public static double RoundToMultiple(double value, double multiple)
    {
        if (multiple < SmallestMultiple || multiple >= LargestRoundable || Math.Abs(value) / multiple >= LargestRoundable)
        {
            return Math.Round(value / multiple, MidpointRounding.AwayFromZero) * multiple;
        }

        var step = (decimal)multiple;
        return (double)(Math.Round((decimal)value / step, 0, MidpointRounding.AwayFromZero) * step);
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
