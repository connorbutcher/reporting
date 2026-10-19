namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>Shared by STDEV and VAR.</summary>
internal static class Spread
{
    /// <summary>The sample variance (dividing by n - 1), or null when there are fewer than two numbers.</summary>
    public static double? SampleVariance(List<double> numbers)
    {
        if (numbers.Count < 2)
        {
            return null;
        }

        var mean = numbers.Average();
        var squares = 0.0;
        foreach (var number in numbers)
        {
            squares += (number - mean) * (number - mean);
        }

        return squares / (numbers.Count - 1);
    }
}
