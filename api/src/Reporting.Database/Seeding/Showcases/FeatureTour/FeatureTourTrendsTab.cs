using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>The point charts.</summary>
internal static class FeatureTourTrendsTab
{
    public static void Add(ReportRevision revision, SeedBatch batch, FeatureTourContext context)
    {
        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Trends", Order = 1 };
        revision.Tabs.Add(tab);
        tab.Widgets.Add(SeedWidgets.Title("Performance trends", 0, 0, 48, 2));

        var log = context.Log;
        var powerRef = context.Ref("Peak Power");
        var torqueRef = context.Ref("Peak Torque");
        var engineRef = context.Ref("Engine Type");
        var buildIdRef = context.Ref("Build ID");
        var inspectorRef = context.Ref("Inspector");
        var dateRef = context.Ref("Build Date");
        var clearanceRef = context.Ref("Main Bearing Clearance");
        var lineRef = context.Ref("Assembly Line");

        var scatter = SeedWidgets.Placeholder(tab, WidgetType.ScatterChart, 0, 2, 24, 16);
        batch.AddChart(scatter, () =>
            ChartWidgetJson.Point("scatterChart", "Power vs torque by engine",
                ChartBindingJson.Binding(log.Id, powerRef, yRef: torqueRef, seriesRef: engineRef),
                ChartBindingJson.Axes(("primary", "Peak torque (Nm)", "left")),
                xAxisLabel: "Peak power (kW)",
                tooltipColumnsJson: ChartBindingJson.TooltipColumns(buildIdRef, inspectorRef),
                zoom: true));

        var heat = SeedWidgets.Placeholder(tab, WidgetType.ScatterChart, 24, 2, 24, 16);
        batch.AddChart(heat, () =>
            ChartWidgetJson.Point("scatterChart", "Torque shaded by value",
                ChartBindingJson.Binding(log.Id, powerRef, yRef: torqueRef),
                ChartBindingJson.Axes(("primary", "Peak torque (Nm)", "left")),
                xAxisLabel: "Peak power (kW)", colorByValue: true, showLegend: false));

        var line = SeedWidgets.Placeholder(tab, WidgetType.LineChart, 0, 18, 48, 11);
        batch.AddChart(line, () =>
            ChartWidgetJson.Point("lineChart", "Bearing clearance over time",
                ChartBindingJson.Binding(log.Id, dateRef, yRef: clearanceRef, seriesRef: lineRef),
                ChartBindingJson.Axes(("primary", "Clearance (mm)", "left")),
                xAxisLabel: "Build date",
                bandsJson: SpecDatasets.BandJson(context.Spec),
                smooth: true, showPoints: true));
    }
}
