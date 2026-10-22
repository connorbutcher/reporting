using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>The point charts: bubbles with a trend line and guide lines, colour by value, raw and aggregated lines.</summary>
internal static class FeatureTourTrendsTab
{
    public static void Add(ReportRevision revision, SeedBatch batch, FeatureTourContext context)
    {
        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Trends", Order = 2, Rows = 43 };
        revision.Tabs.Add(tab);
        tab.Widgets.Add(SeedWidgets.Title("Performance trends", 0, 0, 48, 2));
        tab.Widgets.Add(SeedWidgets.Paragraph(
            "Drag across a chart to zoom (the zoom is remembered while you browse), hover a point for its build ID and "
            + "inspector, and click a legend entry to hide a series. Open the comments in the viewer to see a note pinned to a point.",
            0, 2, 48, 3));

        AddScatters(tab, batch, context);
        AddLines(tab, batch, context);
    }

    private static void AddScatters(Tab tab, SeedBatch batch, FeatureTourContext context)
    {
        var log = context.Log;
        var powerRef = context.Ref("Peak Power");
        var torqueRef = context.Ref("Peak Torque");

        var scatter = SeedWidgets.Placeholder(tab, WidgetType.ScatterChart, 0, 5, 24, 16);
        batch.AddChart(scatter, () =>
            ChartWidgetJson.Point("scatterChart", "Power vs torque by engine (trend lines, guide lines)",
                ChartBindingJson.Binding(log.Id, powerRef, yRef: torqueRef, seriesRef: context.Ref("Engine Type")),
                ChartBindingJson.Axes(("primary", "Peak torque (Nm)", "left")),
                xAxisLabel: "Peak power (kW)",
                tooltipColumnsJson: ChartBindingJson.TooltipColumns(context.Ref("Build ID"), context.Ref("Inspector")),
                zoom: true, showTrendLine: true,
                guideLinesJson: GuideLineJson.List(
                    GuideLineJson.Line("y", 800, "Gearbox torque limit", "#dc2626", outlinePoints: true),
                    GuideLineJson.Line("x", 250, "Emissions class B", "#7c3aed"))));
        batch.AddComment(new PendingComment(context.Report, scatter.RefId, "alice@local",
            "This V12 is the highest-torque build we've logged. @Bob Okafor can you check the dyno trace before we sign it off?",
            ["bob@local"], 30, AnchorX: 480, AnchorY: 810));

        var heat = SeedWidgets.Placeholder(tab, WidgetType.ScatterChart, 24, 5, 24, 16);
        batch.AddChart(heat, () =>
            ChartWidgetJson.Point("scatterChart", "Torque shaded by value",
                ChartBindingJson.Binding(log.Id, powerRef, yRef: torqueRef),
                ChartBindingJson.Axes(("primary", "Peak torque (Nm)", "left")),
                xAxisLabel: "Peak power (kW)", colorByValue: true, showLegend: false));
    }

    private static void AddLines(Tab tab, SeedBatch batch, FeatureTourContext context)
    {
        var log = context.Log;
        var dateRef = context.Ref("Build Date");

        var line = SeedWidgets.Placeholder(tab, WidgetType.LineChart, 0, 21, 48, 11);
        batch.AddChart(line, () =>
            ChartWidgetJson.Point("lineChart", "Bearing clearance over time (spec band)",
                ChartBindingJson.Binding(log.Id, dateRef, yRef: context.Ref("Main Bearing Clearance"), seriesRef: context.Ref("Assembly Line")),
                ChartBindingJson.Axes(("primary", "Clearance (mm)", "left")),
                xAxisLabel: "Build date",
                bandsJson: SpecDatasets.BandJson(context.Spec),
                smooth: true, showPoints: true));

        var weekly = SeedWidgets.Placeholder(tab, WidgetType.LineChart, 0, 32, 48, 11);
        batch.AddChart(weekly, () =>
            ChartWidgetJson.Point("lineChart", "Average build hours per week (aggregated line, target range)",
                ChartBindingJson.Binding(log.Id, dateRef, yRef: context.Ref("Build Hours"), seriesRef: context.Ref("Engine Type")),
                ChartBindingJson.Axes(("primary", "Build hours", "left")),
                xAxisLabel: "Week",
                showPoints: true, areaFill: false,
                aggregate: "average", xGrouping: "week",
                guideLinesJson: GuideLineJson.List(GuideLineJson.Range("y", 20, 30, "Planned hours", "#16a34a"))));
    }
}
