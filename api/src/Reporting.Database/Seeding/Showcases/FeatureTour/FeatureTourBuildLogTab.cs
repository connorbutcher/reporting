using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>The data as a full-featured table and a widget-filtered table.</summary>
internal static class FeatureTourBuildLogTab
{
    public static void Add(ReportRevision revision, SeedBatch batch, FeatureTourContext context)
    {
        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Build log", Order = 0, Rows = 34 };
        revision.Tabs.Add(tab);
        tab.Widgets.Add(SeedWidgets.Title(FeatureTourShowcase.Name, 0, 0, 48, 2));
        tab.Widgets.Add(SeedWidgets.Paragraph(
            "One dataset of 100 engine builds shown through every widget and option: tables and pivots, each chart kind and "
            + "control chart mode, KPI tiles, spec bands and guide lines, formula columns, a filtered dataset, and per-widget "
            + "and report-level filters. The report filter hides the R&D bench prototypes everywhere. Each tab says what to try; "
            + "the last tab, Explore, covers comments, screenshots, View data, drill-through and the larger datasets in "
            + "Performance at Scale.",
            0, 2, 48, 4));

        AddLogTable(tab, batch, context);
        AddReworkTable(tab, batch, context);
    }

    /// <summary>Totals, search, a frozen ID column, data bars, rule highlighting and spec banding in one table.</summary>
    private static void AddLogTable(Tab tab, SeedBatch batch, FeatureTourContext context)
    {
        var table = SeedWidgets.Placeholder(tab, WidgetType.DataTable, 0, 6, 48, 16);
        batch.AddChart(table, () =>
            TableWidgetJson.Config("Engine build log (search, totals, click a row for details)", context.Log,
            [
                new TableColumnSeed("Build ID", Total: "count"),
                new TableColumnSeed("Engine Type"),
                new TableColumnSeed("Assembly Line"),
                new TableColumnSeed("Inspector"),
                new TableColumnSeed("Build Date"),
                new TableColumnSeed("Peak Power", Total: "average"),
                new TableColumnSeed("Peak Torque", Total: "average"),
                new TableColumnSeed("Main Bearing Clearance", Header: "Bearing clearance",
                    ToleranceJson: SpecDatasets.ToleranceJson(context.Spec)),
                new TableColumnSeed("Build Cost", Total: "sum", DataBars: true),
                new TableColumnSeed("Build Hours", Total: "sum"),
                new TableColumnSeed("Rework Count", Total: "max", FormatRulesJson: FormatRuleJson.List(
                    FormatRuleJson.Rule("greaterThanOrEqual", "3", "red"),
                    FormatRuleJson.Rule("between", "1", "amber", "2"),
                    FormatRuleJson.Rule("equals", "0", "green"))),
                new TableColumnSeed("Passed", FormatRulesJson: FormatRuleJson.List(FormatRuleJson.Rule("equals", "false", "bold"))),
            ],
            new TableOptionsSeed(ShowTotals: true, ShowSearch: true, FrozenColumns: 1, Paginator: true, RowsPerPage: 10,
                SortColumnName: "Build Date", SortDirection: "desc")));
    }

    private static void AddReworkTable(Tab tab, SeedBatch batch, FeatureTourContext context)
    {
        var reworkRef = context.Ref("Rework Count");
        tab.Widgets.Add(SeedWidgets.Paragraph(
            "The table on the right has its own widget filter (Rework Count above 0), on top of the report filter. "
            + "Readers can narrow any widget further from its filter button in the viewer without changing the report.",
            0, 22, 16, 12));
        var reworkTable = SeedWidgets.Placeholder(tab, WidgetType.DataTable, 16, 22, 32, 12);
        batch.AddChart(reworkTable, () =>
            TableWidgetJson.Config("Builds needing rework", context.Log,
                ["Build ID", "Engine Type", "Assembly Line", "Rework Count", "Passed"],
                FilterJson.Group("and", FilterJson.Condition(reworkRef, "greaterThan", "0"))));
    }
}
