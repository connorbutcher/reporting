using Reporting.Abstractions;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Reduces one group's values to quartiles (type-7 interpolation, as Excel PERCENTILE.INC), mean, sample
/// standard deviation and whiskers. Whiskers reach the extremes (MinMax), or the furthest values within
/// factor×IQR of the quartiles (Tukey) or factor×σ of the mean (StdDev), with anything beyond an outlier.
/// </summary>
internal static class BoxSummary
{
    /// <summary>Raw values returned per box for the jittered overlay.</summary>
    private const int MaxPointsPerGroup = 300;

    public static (BoxDto Box, List<double> Outliers) Summarise(List<double> values, BoxWhisker whisker, double factor, bool includePoints)
    {
        values.Sort();
        var q1 = Statistics.Quantile(values, 0.25);
        var median = Statistics.Quantile(values, 0.5);
        var q3 = Statistics.Quantile(values, 0.75);
        var mean = values.Average();
        var stdDev = Statistics.StdDev(values, mean);

        double low;
        double high;
        var outliers = new List<double>();
        if (whisker == BoxWhisker.MinMax)
        {
            low = values[0];
            high = values[^1];
        }
        else
        {
            var (lowerFence, upperFence) = Fences(whisker, Math.Max(0, factor), q1, q3, mean, stdDev);
            // A fence tighter than the data can leave no value inside it; clamping to the box keeps the whiskers from inverting.
            low = Math.Min(values.First(value => value >= lowerFence), q1);
            high = Math.Max(values.Last(value => value <= upperFence), q3);
            outliers.AddRange(values.Where(value => value < lowerFence || value > upperFence));
        }

        var box = new BoxDto
        {
            Min = low, Q1 = q1, Median = median, Q3 = q3, Max = high,
            Mean = mean, StdDev = stdDev, Count = values.Count,
            Points = includePoints ? SamplePoints(values) : new List<double>()
        };
        return (box, outliers);
    }

    private static (double Lower, double Upper) Fences(BoxWhisker whisker, double factor, double q1, double q3, double mean, double stdDev)
    {
        if (whisker == BoxWhisker.StdDev)
        {
            return (mean - factor * stdDev, mean + factor * stdDev);
        }
        var iqr = q3 - q1;
        return (q1 - factor * iqr, q3 + factor * iqr);
    }

    /// <summary>An evenly spaced sample of an already sorted list.</summary>
    private static List<double> SamplePoints(List<double> sorted)
    {
        if (sorted.Count <= MaxPointsPerGroup)
        {
            return new List<double>(sorted);
        }

        var step = (double)sorted.Count / MaxPointsPerGroup;
        var sample = new List<double>(MaxPointsPerGroup);
        for (var i = 0; i < MaxPointsPerGroup; i++)
        {
            sample.Add(sorted[(int)(i * step)]);
        }
        return sample;
    }
}
