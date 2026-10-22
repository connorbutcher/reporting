using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>The build log's formula columns, in a table and charted like any stored column.</summary>
internal static class FeatureTourFormulaTab
{
    public static void Add(ReportRevision revision, SeedBatch batch, FeatureTourContext context)
    {
        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Formulas", Order = 7, Rows = 34 };
        revision.Tabs.Add(tab);
        tab.Widgets.Add(SeedWidgets.Title("Formula columns", 0, 0, 48, 2));
        tab.Widgets.Add(SeedWidgets.Paragraph(
            "The last four build log columns are formulas, worked out on the server and stored like any other value, so tables, "
            + "charts, filters and pivots use them directly. Engine Family is " + EngineBuildFormulaColumns.FamilyExpression
            + ", Cost per Hour is " + EngineBuildFormulaColumns.CostPerHourExpression
            + ", Build Week is " + EngineBuildFormulaColumns.BuildWeekExpression
            + " and Needs Review is " + EngineBuildFormulaColumns.NeedsReviewExpression
            + ". Open the dataset in the builder to edit them or try any of the 80-plus functions.",
            0, 2, 48, 4));

        AddTable(tab, batch, context);
        AddCharts(tab, batch, context);
    }

    private static void AddTable(Tab tab, SeedBatch batch, FeatureTourContext context)
    {
        var table = SeedWidgets.Placeholder(tab, WidgetType.DataTable, 0, 6, 24, 28);
        batch.AddChart(table, () =>
            TableWidgetJson.Config("Computed columns", context.Log,
            [
                new TableColumnSeed("Build ID"),
                new TableColumnSeed("Engine Family"),
                new TableColumnSeed("Build Week"),
                new TableColumnSeed("Cost per Hour", Total: "average", DataBars: true),
                new TableColumnSeed("Needs Review", FormatRulesJson: FormatRuleJson.List(FormatRuleJson.Rule("equals", "true", "amber"))),
            ],
            new TableOptionsSeed(ShowTotals: true, SortColumnName: "Cost per Hour", SortDirection: "desc")));
    }

    private static void AddCharts(Tab tab, SeedBatch batch, FeatureTourContext context)
    {
        var log = context.Log;
        var costPerHourRef = context.Ref("Cost per Hour");

        var byFamily = SeedWidgets.Placeholder(tab, WidgetType.BarChart, 24, 6, 24, 14);
        batch.AddChart(byFamily, () =>
            ChartWidgetJson.Bar("Builds by engine family and line", log, context.Ref("Engine Family"), [costPerHourRef], "count",
                stacked: true, horizontal: false, "Builds", seriesRef: context.Ref("Assembly Line"), showStackTotals: true));

        var weekly = SeedWidgets.Placeholder(tab, WidgetType.ComboChart, 24, 20, 24, 14);
        batch.AddChart(weekly, () =>
            ChartWidgetJson.Combo("Cost per hour by build week",
                ChartBindingJson.Binding(log.Id, context.Ref("Build Week"), valueRefs: [costPerHourRef], renderAs: "line",
                    yAxisId: "primary", label: "Avg cost per hour", color: "#0f766e"),
                ChartBindingJson.Axes(("primary", "£ per hour", "left")),
                xAxisLabel: "Week starting", aggregate: "average", stacked: false, smooth: false, showPoints: true, areaFill: true));
    }
}
