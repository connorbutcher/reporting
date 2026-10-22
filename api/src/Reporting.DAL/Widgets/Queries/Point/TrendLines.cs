using Reporting.Abstractions;

namespace Reporting.DAL.Widgets;

internal static class TrendLines
{
    /// <summary>
    /// An ordinary-least-squares fit drawn between the series' own X extremes. Null for fewer than two points
    /// or when every X is the same.
    /// </summary>
    public static TrendLineDto? Compute(IEnumerable<ChartPointDto> points)
    {
        var pairs = points.Select(point => ((double)point.X, (double)point.Y)).ToList();
        if (pairs.Count < 2)
        {
            return null;
        }

        var xMean = pairs.Average(pair => pair.Item1);
        var yMean = pairs.Average(pair => pair.Item2);
        var ssXY = pairs.Sum(pair => (pair.Item1 - xMean) * (pair.Item2 - yMean));
        var ssXX = pairs.Sum(pair => (pair.Item1 - xMean) * (pair.Item1 - xMean));
        if (ssXX == 0)
        {
            return null;
        }

        var slope = ssXY / ssXX;
        var intercept = yMean - slope * xMean;
        var ssYY = pairs.Sum(pair => (pair.Item2 - yMean) * (pair.Item2 - yMean));
        // Every Y identical too: the horizontal line fits perfectly.
        var rSquared = ssYY == 0 ? 1d : (ssXY * ssXY) / (ssXX * ssYY);

        var xMin = pairs.Min(pair => pair.Item1);
        var xMax = pairs.Max(pair => pair.Item1);
        return new TrendLineDto
        {
            X1 = xMin, Y1 = slope * xMin + intercept,
            X2 = xMax, Y2 = slope * xMax + intercept,
            Slope = slope, Intercept = intercept, RSquared = rSquared
        };
    }
}
