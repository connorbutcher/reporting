using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>One control chart per mode: Xbar-R, Xbar-S, individuals with baseline limits and run rules, and p.</summary>
internal static class FeatureTourControlTab
{
    public static void Add(ReportRevision revision, SeedBatch batch, FeatureTourContext context)
    {
        // Control charts draw two grids each, so they get extra height.
        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Control charts", Order = 5, Rows = 67 };
        revision.Tabs.Add(tab);
        tab.Widgets.Add(SeedWidgets.Title("Statistical process control", 0, 0, 48, 2));
        tab.Widgets.Add(SeedWidgets.Paragraph(
            "Out-of-control points are marked with a triangle. The individuals chart holds its limits from the first 30 builds "
            + "and checks Nelson rules 1 to 5; hover a flagged point to see which rule it broke.",
            0, 2, 48, 3));

        AddSubgroupCharts(tab, batch, context);
        AddRowCharts(tab, batch, context);
    }

    private static void AddSubgroupCharts(Tab tab, SeedBatch batch, FeatureTourContext context)
    {
        var log = context.Log;
        var spec = context.Spec;
        var clearanceRef = context.Ref("Main Bearing Clearance");

        var xbarR = SeedWidgets.Placeholder(tab, WidgetType.XBarRChart, 0, 5, 24, 20);
        batch.AddChart(xbarR, () =>
            ChartWidgetJson.XBarR("Clearance by inspector (Xbar-R)", log, context.Ref("Inspector"), clearanceRef, "Clearance (mm)",
                bandsJson: SpecDatasets.BandJson(spec)));
        batch.AddComment(context.Comment(xbarR, "carol@local",
            "Ranges look stable across inspectors, so the gauge study from last quarter is holding up.", 52));

        var xbarS = SeedWidgets.Placeholder(tab, WidgetType.XBarRChart, 24, 5, 24, 20);
        batch.AddChart(xbarS, () =>
            ChartWidgetJson.XBarR("Clearance by week (Xbar-S)", log, context.Ref("Build Date"), clearanceRef, "Clearance (mm)",
                bandsJson: SpecDatasets.BandJson(spec), mode: "xBarS", categoryGrouping: "week"));
    }

    private static void AddRowCharts(Tab tab, SeedBatch batch, FeatureTourContext context)
    {
        var log = context.Log;

        var individuals = SeedWidgets.Placeholder(tab, WidgetType.XBarRChart, 0, 25, 48, 21);
        batch.AddChart(individuals, () =>
            ChartWidgetJson.XBarR("Clearance per build (I-MR, baseline 30, run rules)", log, context.Ref("Build ID"),
                context.Ref("Main Bearing Clearance"), "Clearance (mm)",
                bandsJson: SpecDatasets.BandJson(context.Spec), mode: "individuals", baselineSubgroups: 30, runRules: true));

        var pChart = SeedWidgets.Placeholder(tab, WidgetType.XBarRChart, 0, 46, 48, 21);
        batch.AddChart(pChart, () =>
            ChartWidgetJson.XBarR("Share of builds reworked per week (p chart)", log, context.Ref("Build Date"), context.Ref("Rework Count"),
                "Share reworked", mode: "p", categoryGrouping: "week"));
    }
}
