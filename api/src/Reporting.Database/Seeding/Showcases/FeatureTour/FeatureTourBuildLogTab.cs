using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>The data as a table, a widget-filtered table and a pivot.</summary>
internal static class FeatureTourBuildLogTab
{
    private static readonly string[] LogColumns =
    [
        "Build ID", "Engine Type", "Assembly Line", "Inspector", "Build Date", "Peak Power",
        "Peak Torque", "Main Bearing Clearance", "Build Cost", "Build Hours", "Rework Count", "Passed",
    ];

    public static void Add(ReportRevision revision, SeedBatch batch, FeatureTourContext context)
    {
        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Build log", Order = 0 };
        revision.Tabs.Add(tab);
        tab.Widgets.Add(SeedWidgets.Title(FeatureTourShowcase.Name, 0, 0, 48, 2));
        tab.Widgets.Add(SeedWidgets.Paragraph(
            "One dataset of engine builds, shown through every widget and option the builder offers — a table and a pivot, each chart kind, KPI tiles, tolerance bands, per-widget and report-level filters, dual axes, a second dataset filtered server-side from the first, and six tabs.",
            0, 2, 48, 3));

        var logTable = SeedWidgets.Placeholder(tab, WidgetType.DataTable, 0, 5, 48, 13);
        batch.AddTable(logTable, context.Log, "Engine build log", LogColumns);

        var reworkRef = context.Ref("Rework Count");
        var reworkTable = SeedWidgets.Placeholder(tab, WidgetType.DataTable, 0, 18, 24, 11);
        batch.AddChart(reworkTable, () =>
            TableWidgetJson.Config("Builds needing rework", context.Log,
                ["Build ID", "Engine Type", "Assembly Line", "Rework Count", "Passed"],
                FilterJson.Group("and", FilterJson.Condition(reworkRef, "greaterThan", "0"))));

        var engineRef = context.Ref("Engine Type");
        var lineRef = context.Ref("Assembly Line");
        var measures = StandardPivotMeasures.For(context.Log);
        var pivot = SeedWidgets.Placeholder(tab, WidgetType.PivotTable, 24, 18, 24, 11);
        batch.AddChart(pivot, () => PivotWidgetJson.Config("Builds by engine & line", context.Log, [engineRef, lineRef], measures));
    }
}
