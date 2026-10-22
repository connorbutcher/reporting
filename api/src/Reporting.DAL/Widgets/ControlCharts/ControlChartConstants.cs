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

    // Xbar-S constants, indexed the same way: A3 scales the average standard deviation into the
    // X-bar limits, B3/B4 into the S chart's own.
    private static readonly (double A3, double B3, double B4)[] STable =
    [
        (2.659, 0.000, 3.267), // n=2
        (1.954, 0.000, 2.568), // n=3
        (1.628, 0.000, 2.266), // n=4
        (1.427, 0.000, 2.089), // n=5
        (1.287, 0.030, 1.970), // n=6
        (1.182, 0.118, 1.882), // n=7
        (1.099, 0.185, 1.815), // n=8
        (1.032, 0.239, 1.761), // n=9
        (0.975, 0.284, 1.716), // n=10
        (0.927, 0.321, 1.679), // n=11
        (0.886, 0.354, 1.646), // n=12
        (0.850, 0.382, 1.618), // n=13
        (0.817, 0.406, 1.594), // n=14
        (0.789, 0.428, 1.572), // n=15
        (0.763, 0.448, 1.552), // n=16
        (0.739, 0.466, 1.534), // n=17
        (0.718, 0.482, 1.518), // n=18
        (0.698, 0.497, 1.503), // n=19
        (0.680, 0.510, 1.490), // n=20
        (0.663, 0.523, 1.477), // n=21
        (0.647, 0.534, 1.466), // n=22
        (0.633, 0.545, 1.455), // n=23
        (0.619, 0.555, 1.445), // n=24
        (0.606, 0.565, 1.435), // n=25
    ];

    /// <summary>The Xbar-S (A3, B3, B4) triple for a subgroup of size <paramref name="n"/>, clamped to 2..25 like <see cref="Lookup"/>.</summary>
    public static (double A3, double B3, double B4) LookupS(int n) => STable[Math.Clamp(n, 2, 25) - 2];

    /// <summary>
    /// Individuals–moving range constants: the X limits sit 2.66 average moving ranges (3 / d2 for
    /// n = 2) either side of the mean; the moving range's upper limit is D4 = 3.267 of its average.
    /// </summary>
    public const double IndividualsE2 = 2.66;
    public const double MovingRangeD4 = 3.267;
}
