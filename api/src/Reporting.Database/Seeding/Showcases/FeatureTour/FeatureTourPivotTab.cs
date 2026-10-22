using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>A cross-tab pivot, and a month-grouped pivot with subtotals and every measure option.</summary>
internal static class FeatureTourPivotTab
{
    public static void Add(ReportRevision revision, SeedBatch batch, FeatureTourContext context)
    {
        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Pivots", Order = 1, Rows = 37 };
        revision.Tabs.Add(tab);
        tab.Widgets.Add(SeedWidgets.Title("Pivot tables", 0, 0, 48, 2));
        tab.Widgets.Add(SeedWidgets.Paragraph(
            "Click any pivot cell to drill through to the builds behind it. Click a measure header to sort, "
            + "and collapse a month's subtotal row to hide its engines.",
            0, 2, 48, 3));

        AddCrossTab(tab, batch, context);
        AddMonthlyPivot(tab, batch, context);
    }

    /// <summary>Engines down, assembly lines across, with a totals column group.</summary>
    private static void AddCrossTab(Tab tab, SeedBatch batch, FeatureTourContext context)
    {
        var engineRef = context.Ref("Engine Type");
        var lineRef = context.Ref("Assembly Line");
        var measures = StandardPivotMeasures.For(context.Log);
        var pivot = SeedWidgets.Placeholder(tab, WidgetType.PivotTable, 0, 5, 48, 12);
        batch.AddChart(pivot, () =>
            PivotWidgetJson.Config("Builds by engine (down) and line (across)", context.Log, [engineRef], measures,
                columnFieldRefs: [lineRef]));
    }

    /// <summary>Build Date grouped by month, then engine, with distinct count, median, share of total, data bars and rules.</summary>
    private static void AddMonthlyPivot(Tab tab, SeedBatch batch, FeatureTourContext context)
    {
        var dateRef = context.Ref("Build Date");
        var engineRef = context.Ref("Engine Type");
        PivotMeasureSeed[] measures =
        [
            new(null, "count", "Builds"),
            new(context.Ref("Inspector"), "countDistinct", "Inspectors"),
            new(context.Ref("Main Bearing Clearance"), "median", "Median clearance"),
            new(context.Ref("Build Cost"), "sum", "Share of cost", ShowAs: "percentOfTotal", DataBars: true),
            new(context.Ref("Build Hours"), "sum", "Share of month's hours", ShowAs: "percentOfParent"),
            new(context.Ref("Rework Count"), "average", "Avg rework", FormatRulesJson: FormatRuleJson.List(
                FormatRuleJson.Rule("greaterThan", "1.5", "red"),
                FormatRuleJson.Rule("lessThan", "0.75", "green"))),
        ];
        var pivot = SeedWidgets.Placeholder(tab, WidgetType.PivotTable, 0, 17, 48, 20);
        batch.AddChart(pivot, () =>
            PivotWidgetJson.Config("Monthly builds by engine (date grouping, subtotals)", context.Log, [dateRef, engineRef], measures,
                fieldGroupingsJson: PivotWidgetJson.DateGrouping(dateRef, "month"), showSubtotals: true));
    }
}
