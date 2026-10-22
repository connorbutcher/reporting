namespace Reporting.Database;

/// <summary>A guide to the interactive features that have no widget of their own.</summary>
internal static class FeatureTourExploreTab
{
    private static readonly (string Heading, string Body)[] Sections =
    [
        ("Widget header buttons",
            "Every widget has View data (charts: the values as a table in a dialog, with a CSV download), Download screenshot (PNG), "
            + "Download data (CSV; a table exports every matched row, up to 50,000) and View full screen."),
        ("Drill-through",
            "Click a bar, box, histogram bin, control chart point or pivot cell to open the rows behind it. Click a table row "
            + "to see every column of that build."),
        ("Comments",
            "In the viewer, open Comments to see notes left on the scatter chart (pinned to a point), the Xbar-R chart and the "
            + "average cost KPI. Type @ to mention someone, and pin a new comment to a point on any point chart."),
        ("Filters",
            "The report filter hides the R&D bench builds. In the viewer, Filters narrows the whole report for you only, the "
            + "funnel on a widget narrows that widget, and Copy link shares your filtered view."),
        ("Versions",
            "This report is published as version 1. Check out to edit makes a draft; publishing it adds version 2, and the "
            + "History tab in the viewer opens any earlier version."),
        ("Scale",
            "The Performance at Scale report runs the same widgets over 100,000 and 1,000,000 rows. Its notes list where the "
            + "app samples or caps what it sends to the browser."),
    ];

    public static void Add(ReportRevision revision)
    {
        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Explore", Order = 9, Rows = 32 };
        revision.Tabs.Add(tab);
        tab.Widgets.Add(SeedWidgets.Title("Things to try", 0, 0, 48, 2));

        SeedWidgets.AddSections(tab, Sections, 2);
    }
}
