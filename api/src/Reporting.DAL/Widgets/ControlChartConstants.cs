namespace Reporting.DAL.Widgets;

/// <summary>
/// Standard Shewhart Xbar-R control chart constants, by subgroup size. A2 scales the average range
/// into the X-bar chart's control limits around the grand mean; D3/D4 scale it into the R chart's
/// own lower/upper limits. Published tables (e.g. Montgomery's <em>Introduction to Statistical
/// Quality Control</em>) cover n = 2..25 — the practical range for an Xbar-R chart, since larger
/// subgroups move to an Xbar-S chart instead — so a subgroup outside that range clamps to the
/// nearest end rather than extrapolating.
/// </summary>
internal static class ControlChartConstants
{
    // Indexed by (n - 2): n = 2 at [0], n = 25 at [23].
    private static readonly (double A2, double D3, double D4)[] Table =
    [
        (1.880, 0.000, 3.267), // n=2
        (1.023, 0.000, 2.574), // n=3
        (0.729, 0.000, 2.282), // n=4
        (0.577, 0.000, 2.114), // n=5
        (0.483, 0.000, 2.004), // n=6
        (0.419, 0.076, 1.924), // n=7
        (0.373, 0.136, 1.864), // n=8
        (0.337, 0.184, 1.816), // n=9
        (0.308, 0.223, 1.777), // n=10
        (0.285, 0.256, 1.744), // n=11
        (0.266, 0.283, 1.717), // n=12
        (0.249, 0.307, 1.693), // n=13
        (0.235, 0.328, 1.672), // n=14
        (0.223, 0.347, 1.653), // n=15
        (0.212, 0.363, 1.637), // n=16
        (0.203, 0.378, 1.622), // n=17
        (0.194, 0.391, 1.608), // n=18
        (0.187, 0.403, 1.597), // n=19
        (0.180, 0.415, 1.585), // n=20
        (0.173, 0.425, 1.575), // n=21
        (0.167, 0.434, 1.566), // n=22
        (0.162, 0.443, 1.557), // n=23
        (0.157, 0.451, 1.548), // n=24
        (0.153, 0.459, 1.541), // n=25
    ];

    /// <summary>
    /// The (A2, D3, D4) triple for a subgroup of size <paramref name="n"/>. Clamped to the table's
    /// 2..25 range — a subgroup of 1 has no meaningful range, so its control limits borrow n=2's
    /// constants (the caller still reports its true size and excludes it from the averaged range).
    /// </summary>
    public static (double A2, double D3, double D4) Lookup(int n)
    {
        var clamped = Math.Clamp(n, 2, 25);
        return Table[clamped - 2];
    }
}
