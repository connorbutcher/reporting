using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>Widgets bound to the High-Rework Builds filtered dataset.</summary>
internal static class FeatureTourFilteredTab
{
    public static void Add(ReportRevision revision, SeedBatch batch, FeatureTourContext context)
    {
        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Filtered dataset", Order = 5 };
        revision.Tabs.Add(tab);
        tab.Widgets.Add(SeedWidgets.Title("Filtered dataset", 0, 0, 48, 2));
        tab.Widgets.Add(SeedWidgets.Paragraph(
            "High-Rework Builds has no columns or rows of its own — it's the build log above, narrowed "
            + "server-side to the builds that needed rework. Every widget bound to it, like the table and "
            + "KPI below, sees that restriction automatically: the same effect as the report-level filter "
            + "on the Build log tab, but saved once on the dataset instead of repeated per widget.",
            0, 2, 48, 3));

        var table = SeedWidgets.Placeholder(tab, WidgetType.DataTable, 0, 5, 36, 13);
        batch.AddChart(table, () =>
            TableWidgetJson.Config("High-rework builds", context.Log,
                ["Build ID", "Engine Type", "Assembly Line", "Inspector", "Rework Count", "Passed"],
                datasetIdOverride: context.HighRework.Id));

        var count = SeedWidgets.Placeholder(tab, WidgetType.Kpi, 36, 5, 12, 13);
        batch.AddChart(count, () =>
            KpiWidgetJson.Config("High-rework builds", context.HighRework, "aggregate", "count", null, "null", "fail", true,
                "none", null, null, 7, "higherIsBetter", "", "", 0));
    }
}
