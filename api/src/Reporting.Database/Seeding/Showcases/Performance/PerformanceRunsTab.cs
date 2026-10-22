using System.Globalization;
using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>Row-level widgets over the dyno runs: a scrolling table with totals, a sampled scatter and grouped charts.</summary>
internal static class PerformanceRunsTab
{
    public static void Add(ReportRevision revision, SeedBatch batch, PerformanceContext context)
    {
        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Dyno runs", Order = 4, Rows = 51 };
        revision.Tabs.Add(tab);
        var rows = context.Sizes.DynoRuns.ToString("N0", CultureInfo.InvariantCulture);
        tab.Widgets.Add(SeedWidgets.Title($"{rows} dyno test runs", 0, 0, 48, 2));
        tab.Widgets.Add(SeedWidgets.Paragraph(
            "The table loads rows in windows as you scroll, and its totals cover every matched row, not just the loaded ones. "
            + "The scatter plots an even sample of 20,000 runs across the power range and says so in its footer.",
            0, 2, 48, 3));

        AddTable(tab, batch, context);
        AddCharts(tab, batch, context);
    }

    private static void AddTable(Tab tab, SeedBatch batch, PerformanceContext context)
    {
        var table = SeedWidgets.Placeholder(tab, WidgetType.DataTable, 0, 5, 48, 16);
        batch.AddChart(table, () =>
            TableWidgetJson.Config("All runs", context.Runs,
            [
                new TableColumnSeed("Run ID", Total: "count"),
                new TableColumnSeed("Test Cell"),
                new TableColumnSeed("Engine Type"),
                new TableColumnSeed("Run Date"),
                new TableColumnSeed("Peak Power", Total: "average", DataBars: true),
                new TableColumnSeed("Fuel Rate", Total: "sum"),
                new TableColumnSeed("Oil Temp", Total: "max"),
                new TableColumnSeed("Result", FormatRulesJson: FormatRuleJson.List(
                    FormatRuleJson.Rule("equals", "Fail", "red"),
                    FormatRuleJson.Rule("equals", "Retest", "amber"))),
            ],
            new TableOptionsSeed(ShowTotals: true, ShowSearch: true, FrozenColumns: 1)));
    }

    private static void AddCharts(Tab tab, SeedBatch batch, PerformanceContext context)
    {
        var runs = context.Runs;
        var cellRef = context.Run("Test Cell");

        var scatter = SeedWidgets.Placeholder(tab, WidgetType.ScatterChart, 0, 21, 24, 15);
        batch.AddChart(scatter, () =>
            ChartWidgetJson.Point("scatterChart", "Fuel rate vs power (sampled)",
                ChartBindingJson.Binding(runs.Id, context.Run("Peak Power"), yRef: context.Run("Fuel Rate"), seriesRef: context.Run("Engine Type")),
                ChartBindingJson.Axes(("primary", "Fuel rate (kg/h)", "left")),
                xAxisLabel: "Peak power (kW)", showTrendLine: true));

        var results = SeedWidgets.Placeholder(tab, WidgetType.BarChart, 24, 21, 24, 15);
        batch.AddChart(results, () =>
            ChartWidgetJson.Bar("Results by test cell", runs, cellRef, [context.Run("Peak Power")], "count",
                stacked: true, horizontal: false, "Share of runs", seriesRef: context.Run("Result"), percentStacked: true));

        var combo = SeedWidgets.Placeholder(tab, WidgetType.ComboChart, 0, 36, 48, 15);
        batch.AddChart(combo, () =>
            ChartWidgetJson.Combo("Weekly runs and oil temp",
                string.Join(",",
                    ChartBindingJson.Binding(runs.Id, context.Run("Run Date"), valueRefs: [context.Run("Peak Power")], renderAs: "bar",
                        yAxisId: "primary", label: "Avg power", color: "#2f6fed"),
                    ChartBindingJson.Binding(runs.Id, context.Run("Run Date"), valueRefs: [context.Run("Oil Temp")], renderAs: "line",
                        yAxisId: "oil", label: "Avg oil temp", color: "#f97316")),
                ChartBindingJson.Axes(("primary", "Power (kW)", "left"), ("oil", "Oil temp (°C)", "right")),
                xAxisLabel: "Week", aggregate: "average", stacked: false, smooth: true, showPoints: false, areaFill: false,
                categoryGrouping: "week"));
    }
}
