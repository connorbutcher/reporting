using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>The aggregating bar chart and a combination chart on two value axes.</summary>
internal static class FeatureTourCostTab
{
    public static void Add(ReportRevision revision, SeedBatch batch, FeatureTourContext context)
    {
        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Cost & effort", Order = 2 };
        revision.Tabs.Add(tab);
        tab.Widgets.Add(SeedWidgets.Title("Cost & effort", 0, 0, 48, 2));

        var log = context.Log;
        var engineRef = context.Ref("Engine Type");
        var costRef = context.Ref("Build Cost");
        var hoursRef = context.Ref("Build Hours");
        var lineRef = context.Ref("Assembly Line");

        var bar = SeedWidgets.Placeholder(tab, WidgetType.BarChart, 0, 2, 24, 16);
        batch.AddChart(bar, () =>
            ChartWidgetJson.Bar("Average build cost by engine", log, engineRef, [costRef], "average",
                stacked: false, horizontal: false, "Cost (£)", seriesRef: lineRef));

        var combo = SeedWidgets.Placeholder(tab, WidgetType.ComboChart, 24, 2, 24, 16);
        batch.AddChart(combo, () =>
            ChartWidgetJson.Combo("Cost vs build hours by engine",
                string.Join(",",
                    ChartBindingJson.Binding(log.Id, engineRef, valueRefs: [costRef], renderAs: "bar", yAxisId: "primary", label: "Avg cost", color: "#2f6fed"),
                    ChartBindingJson.Binding(log.Id, engineRef, valueRefs: [hoursRef], renderAs: "line", yAxisId: "hours", label: "Avg hours", color: "#f97316")),
                ChartBindingJson.Axes(("primary", "Cost (£)", "left"), ("hours", "Build hours", "right")),
                xAxisLabel: "", aggregate: "average", stacked: false, smooth: true, showPoints: true, areaFill: false));
    }
}
