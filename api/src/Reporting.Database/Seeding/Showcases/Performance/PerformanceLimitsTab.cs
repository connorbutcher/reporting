namespace Reporting.Database;

/// <summary>
/// Where the app samples or caps at scale. The numbers mirror the query services' constants (TableQueryService,
/// ChartQueryService, PivotQueryService, HistogramBinning, BoxSummary, ScanCapping), which this project can't reference.
/// </summary>
internal static class PerformanceLimitsTab
{
    private static readonly (string Heading, string Body)[] Sections =
    [
        ("Tables",
            "A page holds at most 500 rows; a scrolling table fetches 200-row windows as you scroll, so any number of rows can be browsed. "
            + "Totals, data bars and search cover every matched row. CSV export stops at 50,000 rows and says so."),
        ("Point charts",
            "Scatter and raw line charts plot at most 20,000 points, sampled evenly along X, and the footer says the chart is sampled. "
            + "A line chart with an aggregate reduces every row in the database first, so it isn't sampled."),
        ("Bars, pivots and KPIs",
            "Counts, sums, averages, minimums and maximums run in the database over every row. Pivots show up to 2,000 row groups "
            + "and 100 column groups; median and distinct-count measures scan rows on the server instead."),
        ("Distributions and SPC",
            "Histograms (up to 500 bins), box plots, control charts and tolerance KPIs scan up to 1,000,000 matched rows and flag the "
            + "result if there are more. Box plots draw at most 300 points per box. Individuals (I-MR) charts send one point per row, "
            + "so group large data into subgroups (Xbar-R or Xbar-S) instead."),
        ("Loading a tab",
            "The viewer queries every widget on a tab at the same time. A full pass over a million rows takes a few seconds, and "
            + "several side by side can pass the database's 30-second timeout on a small server, so the readings are spread over four tabs."),
        ("Editing this report",
            "Checking out or publishing copies every row and cell into the new version, which is slow at this size. "
            + "Explore it in the viewer instead."),
    ];

    public static void Add(ReportRevision revision)
    {
        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Limits", Order = 5, Rows = 42 };
        revision.Tabs.Add(tab);
        tab.Widgets.Add(SeedWidgets.Title("What happens at scale", 0, 0, 48, 2));

        SeedWidgets.AddSections(tab, Sections, 2);
    }
}
