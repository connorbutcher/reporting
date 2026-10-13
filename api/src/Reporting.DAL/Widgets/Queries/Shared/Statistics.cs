namespace Reporting.DAL.Widgets;

/// <summary>Small numeric reductions shared by the in-memory chart summaries.</summary>
public static class Statistics
{
    /// <summary>The percentile-th quantile (0..1) of an already-sorted list, linearly interpolated between ranks.</summary>
    public static double Quantile(IReadOnlyList<double> sorted, double percentile)
    {
        if (sorted.Count == 1)
        {
            return sorted[0];
        }

        var rank = (sorted.Count - 1) * percentile;
        var lowerIndex = (int)Math.Floor(rank);
        if (lowerIndex >= sorted.Count - 1)
        {
            return sorted[^1];
        }

        return sorted[lowerIndex] + (rank - lowerIndex) * (sorted[lowerIndex + 1] - sorted[lowerIndex]);
    }

    /// <summary>The sample standard deviation (n−1 divisor); 0 for fewer than two values.</summary>
    public static double StdDev(IReadOnlyList<double> values, double mean)
    {
        if (values.Count < 2)
        {
            return 0;
        }

        var sumOfSquares = 0.0;
        foreach (var value in values)
        {
            var deviation = value - mean;
            sumOfSquares += deviation * deviation;
        }
        return Math.Sqrt(sumOfSquares / (values.Count - 1));
    }
}
