namespace Reporting.DAL.Widgets;

/// <summary>
/// The Nelson rules for spotting a process out of statistical control, evaluated over one control
/// chart's points in display order. Each point is judged against its own centre line and sigma (a
/// third of the distance to its upper limit), since limits step when subgroup sizes differ. Every
/// point in a qualifying run is flagged, not just the one that completes it, so the run reads at a glance.
/// </summary>
public static class ControlChartRules
{
    /// <summary>One plotted point: its value, its centre line, and its control limits. Null value = not plotted.</summary>
    public readonly record struct Point(double? Value, double Center, double Upper, double Lower);

    /// <summary>
    /// The rules each point breaks, in point order. Rule 1 (beyond 3σ) is always evaluated; rules 2–5
    /// only when <paramref name="runRules"/>:
    /// 2 — nine points in a row on one side of the centre line;
    /// 3 — six points in a row steadily increasing or decreasing;
    /// 4 — fourteen points in a row alternating up and down;
    /// 5 — two of three points in a row beyond 2σ on the same side.
    /// </summary>
    public static List<List<int>> Evaluate(IReadOnlyList<Point> points, bool runRules)
    {
        var flags = points.Select(_ => new SortedSet<int>()).ToList();
        var indexed = points
            .Select((point, index) => (point, index))
            .Where(entry => entry.point.Value is not null)
            .ToList();

        foreach (var (point, index) in indexed)
        {
            if (point.Value > point.Upper || point.Value < point.Lower)
            {
                flags[index].Add(1);
            }
        }

        if (runRules)
        {
            FlagRuns(indexed, flags, 9, 2, SameSide);
            FlagRuns(indexed, flags, 6, 3, Trending);
            FlagRuns(indexed, flags, 14, 4, Alternating);
            FlagRuns(indexed, flags, 3, 5, window => window.Count(p => Beyond(p, 2, +1)) >= 2 || window.Count(p => Beyond(p, 2, -1)) >= 2,
                // Only the points actually beyond 2σ are part of the signal, not the one in between.
                point => Beyond(point, 2, +1) || Beyond(point, 2, -1));
        }

        return flags.Select(set => set.ToList()).ToList();
    }

    /// <summary>Flags every point of each run of <paramref name="length"/> consecutive plotted points matching <paramref name="matches"/>.</summary>
    private static void FlagRuns(
        List<(Point point, int index)> indexed,
        List<SortedSet<int>> flags,
        int length,
        int rule,
        Func<IReadOnlyList<Point>, bool> matches,
        Func<Point, bool>? flagged = null)
    {
        for (var start = 0; start + length <= indexed.Count; start++)
        {
            var window = indexed.Skip(start).Take(length).ToList();
            var windowPoints = window.Select(entry => entry.point).ToList();
            if (!matches(windowPoints))
            {
                continue;
            }
            foreach (var (point, index) in window)
            {
                if (flagged is null || flagged(point))
                {
                    flags[index].Add(rule);
                }
            }
        }
    }

    private static bool SameSide(IReadOnlyList<Point> window) =>
        window.All(p => p.Value > p.Center) || window.All(p => p.Value < p.Center);

    private static bool Trending(IReadOnlyList<Point> window)
    {
        var rising = true;
        var falling = true;
        for (var i = 1; i < window.Count; i++)
        {
            rising &= window[i].Value > window[i - 1].Value;
            falling &= window[i].Value < window[i - 1].Value;
        }
        return rising || falling;
    }

    private static bool Alternating(IReadOnlyList<Point> window)
    {
        for (var i = 2; i < window.Count; i++)
        {
            var previous = Math.Sign(window[i - 1].Value!.Value - window[i - 2].Value!.Value);
            var current = Math.Sign(window[i].Value!.Value - window[i - 1].Value!.Value);
            if (previous == 0 || current == 0 || previous == current)
            {
                return false;
            }
        }
        return true;
    }

    /// <summary>Whether a point sits more than <paramref name="sigmas"/>σ from its centre on the given side (+1 above, −1 below).</summary>
    private static bool Beyond(Point point, double sigmas, int side)
    {
        var sigma = (point.Upper - point.Center) / 3;
        return side > 0
            ? point.Value > point.Center + sigmas * sigma
            : point.Value < point.Center - sigmas * sigma;
    }
}
