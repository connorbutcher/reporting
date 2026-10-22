using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>The bar chart options (series split, date grouping, stack totals, 100% stacks, Top N) and a dual-axis combination chart.</summary>
internal static class FeatureTourCostTab
{
    public static void Add(ReportRevision revision, SeedBatch batch, FeatureTourContext context)
    {
        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Cost & effort", Order = 3, Rows = 36 };
        revision.Tabs.Add(tab);
        tab.Widgets.Add(SeedWidgets.Title("Cost & effort", 0, 0, 48, 2));

        AddAverageCharts(tab, batch, context);
        AddStackedCharts(tab, batch, context);
    }

    private static void AddAverageCharts(Tab tab, SeedBatch batch, FeatureTourContext context)
    {
        var log = context.Log;
        var engineRef = context.Ref("Engine Type");
        var costRef = context.Ref("Build Cost");
        var hoursRef = context.Ref("Build Hours");

        var bar = SeedWidgets.Placeholder(tab, WidgetType.BarChart, 0, 2, 24, 16);
        batch.AddChart(bar, () =>
            ChartWidgetJson.Bar("Average build cost by engine (click a bar to drill through)", log, engineRef, [costRef], "average",
                stacked: false, horizontal: false, "Cost (£)", seriesRef: context.Ref("Assembly Line"),
                sortJson: ChartSortJson.ByColumn(costRef, "average", descending: true),
                guideLinesJson: GuideLineJson.List(GuideLineJson.Line("y", 9000, "Budget", "#dc2626"))));

        var combo = SeedWidgets.Placeholder(tab, WidgetType.ComboChart, 24, 2, 24, 16);
        batch.AddChart(combo, () =>
            ChartWidgetJson.Combo("Cost vs build hours by engine",
                string.Join(",",
                    ChartBindingJson.Binding(log.Id, engineRef, valueRefs: [costRef], renderAs: "bar", yAxisId: "primary", label: "Avg cost", color: "#2f6fed"),
                    ChartBindingJson.Binding(log.Id, engineRef, valueRefs: [hoursRef], renderAs: "line", yAxisId: "hours", label: "Avg hours", color: "#f97316")),
                ChartBindingJson.Axes(("primary", "Cost (£)", "left"), ("hours", "Build hours", "right")),
                xAxisLabel: "", aggregate: "average", stacked: false, smooth: true, showPoints: true, areaFill: false,
                connectNulls: true));
    }

    private static void AddStackedCharts(Tab tab, SeedBatch batch, FeatureTourContext context)
    {
        var log = context.Log;
        var engineRef = context.Ref("Engine Type");
        var costRef = context.Ref("Build Cost");
        var hoursRef = context.Ref("Build Hours");

        var monthly = SeedWidgets.Placeholder(tab, WidgetType.BarChart, 0, 18, 18, 18);
        batch.AddChart(monthly, () =>
            ChartWidgetJson.Bar("Monthly spend by engine (stack totals)", log, context.Ref("Build Date"), [costRef], "sum",
                stacked: true, horizontal: false, "Cost (£)", seriesRef: engineRef,
                categoryGrouping: "month", showStackTotals: true));

        var share = SeedWidgets.Placeholder(tab, WidgetType.BarChart, 18, 18, 15, 18);
        batch.AddChart(share, () =>
            ChartWidgetJson.Bar("Engine mix by inspector (100% stacked)", log, context.Ref("Inspector"), [hoursRef], "count",
                stacked: true, horizontal: false, "Share of builds", seriesRef: engineRef,
                percentStacked: true));

        var topN = SeedWidgets.Placeholder(tab, WidgetType.BarChart, 33, 18, 15, 18);
        batch.AddChart(topN, () =>
            ChartWidgetJson.Bar("Top 3 inspectors by hours, rest as Other", log, context.Ref("Inspector"), [hoursRef], "sum",
                stacked: false, horizontal: true, "Build hours",
                sortJson: ChartSortJson.ByColumn(hoursRef, "sum", descending: true, limit: 3, showOther: true),
                showValueLabels: true));
    }
}
