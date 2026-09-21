using Reporting.Abstractions;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// Changing a column's type breaks only the uses that need what the old type had — a number for a
/// measure or a histogram, an operator and operands for a filter — not everything that mentions it.
/// </summary>
public class ColumnTypeImpactTests : SqliteDbTestBase
{
    private readonly Guid _region = Guid.NewGuid();
    private readonly Guid _revenue = Guid.NewGuid();
    private readonly Guid _notes = Guid.NewGuid();

    public ColumnTypeImpactTests() : base(foreignKeys: false) { }

    private DatasetColumnUsageService Service() => new(Db);

    private sealed record Seed(ReportRevision Draft, Dataset Data, Tab Tab);

    private async Task<Seed> SeedAsync()
    {
        var report = new Report { RefId = Guid.NewGuid(), Number = 1, Name = "R", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        Db.Reports.Add(report);
        await Db.SaveChangesAsync();

        var draft = new ReportRevision { RefId = Guid.NewGuid(), ReportId = report.Id, Kind = RevisionKind.Draft, CreatedAt = DateTime.UtcNow };
        Db.ReportRevisions.Add(draft);
        await Db.SaveChangesAsync();

        var tab = new Tab { RefId = Guid.NewGuid(), ReportRevisionId = draft.Id, Name = "Overview", Order = 0 };
        Db.Tabs.Add(tab);
        var data = new Dataset
        {
            Name = "Sales",
            DatasetSourceId = 1,
            ReportRevisionId = draft.Id,
            Columns =
            {
                new DatasetColumn { RefId = _region, Name = "Region", Type = DatasetColumnType.String, Order = 0 },
                new DatasetColumn { RefId = _revenue, Name = "Revenue", Type = DatasetColumnType.Double, Order = 1 },
                new DatasetColumn { RefId = _notes, Name = "Notes", Type = DatasetColumnType.String, Order = 2 },
            },
        };
        Db.Datasets.Add(data);
        await Db.SaveChangesAsync();
        return new Seed(draft, data, tab);
    }

    private async Task AddWidgetAsync(Tab tab, WidgetType type, string configJson)
    {
        Db.Widgets.Add(new Widget { RefId = Guid.NewGuid(), TabId = tab.Id, Type = type, W = 4, H = 4, ConfigJson = configJson });
        await Db.SaveChangesAsync();
    }

    private async Task<ColumnTypeImpactDto> ImpactAsync(Seed seed, Guid column, DatasetColumnType to) =>
        (await Service().GetTypeChangeImpactAsync(seed.Data.Id, column, to))!;

    private static List<string> Reasons(ColumnTypeImpactDto impact) => impact.Breaks.SelectMany(b => b.Roles).ToList();

    private static string Condition(Guid column, string op, params string[] values) =>
        $$"""{ "kind": "condition", "columnId": "{{column}}", "operator": "{{op}}", "values": [{{string.Join(",", values.Select(v => $"\"{v}\""))}}] }""";

    private static string FilterOn(params string[] conditions) =>
        $$"""{ "kind": "group", "join": "and", "children": [ {{string.Join(",", conditions)}} ] }""";

    [Fact]
    public async Task A_bar_chart_measure_needs_a_number_unless_the_chart_only_counts()
    {
        var seed = await SeedAsync();
        await AddWidgetAsync(seed.Tab, WidgetType.BarChart, $$"""
        { "type": "barChart", "title": "Sum", "aggregate": "sum",
          "bindings": [ { "datasetId": {{seed.Data.Id}}, "xColumnId": "{{_region}}", "yColumnId": "{{_revenue}}", "valueColumnIds": ["{{_revenue}}"] } ] }
        """);
        await AddWidgetAsync(seed.Tab, WidgetType.BarChart, $$"""
        { "type": "barChart", "title": "Count", "aggregate": "count",
          "bindings": [ { "datasetId": {{seed.Data.Id}}, "xColumnId": "{{_region}}", "yColumnId": "{{_revenue}}", "valueColumnIds": ["{{_revenue}}"] } ] }
        """);

        var impact = await ImpactAsync(seed, _revenue, DatasetColumnType.String);

        var broken = Assert.Single(impact.Breaks);
        Assert.Equal("Sum", broken.WidgetTitle);
        Assert.Contains("Value column needs a number", broken.Roles);
        Assert.Contains("Y / value column needs a number", broken.Roles);
    }

    [Fact]
    public async Task Changing_between_number_types_breaks_nothing_and_a_text_axis_is_fine_on_a_scatter_chart()
    {
        var seed = await SeedAsync();
        await AddWidgetAsync(seed.Tab, WidgetType.ScatterChart, $$"""
        { "type": "scatterChart", "bindings": [ { "datasetId": {{seed.Data.Id}}, "xColumnId": "{{_region}}", "yColumnId": "{{_revenue}}" } ] }
        """);
        await AddWidgetAsync(seed.Tab, WidgetType.BarChart, $$"""
        { "type": "barChart", "aggregate": "sum", "bindings": [ { "datasetId": {{seed.Data.Id}}, "xColumnId": "{{_region}}", "valueColumnIds": ["{{_revenue}}"] } ] }
        """);

        Assert.Empty((await ImpactAsync(seed, _revenue, DatasetColumnType.Int)).Breaks);

        // Text on a scatter chart's Y axis works, so only the bar chart's measure is reported.
        var toText = await ImpactAsync(seed, _revenue, DatasetColumnType.String);
        var broken = Assert.Single(toText.Breaks);
        Assert.Equal(WidgetType.BarChart, broken.WidgetType);
    }

    [Fact]
    public async Task A_box_plot_value_and_a_histogram_need_numbers_but_a_box_plot_category_does_not()
    {
        var seed = await SeedAsync();
        await AddWidgetAsync(seed.Tab, WidgetType.BoxPlot, $$"""
        { "type": "boxPlot", "bindings": [ { "datasetId": {{seed.Data.Id}}, "xColumnId": "{{_region}}", "yColumnId": "{{_revenue}}" } ] }
        """);
        await AddWidgetAsync(seed.Tab, WidgetType.Histogram, $$"""
        { "type": "histogram", "bindings": [ { "datasetId": {{seed.Data.Id}}, "xColumnId": "{{_revenue}}" } ] }
        """);

        Assert.Equal(2, (await ImpactAsync(seed, _revenue, DatasetColumnType.String)).Breaks.Count);
        Assert.Empty((await ImpactAsync(seed, _region, DatasetColumnType.Int)).Breaks);
    }

    [Fact]
    public async Task A_pivot_measure_needs_a_number_but_a_grouping_or_a_count_does_not()
    {
        var seed = await SeedAsync();
        await AddWidgetAsync(seed.Tab, WidgetType.PivotTable, $$"""
        { "type": "pivotTable", "rowFields": ["{{_region}}"],
          "measures": [ { "columnId": "{{_revenue}}", "aggregate": "sum" }, { "columnId": "{{_notes}}", "aggregate": "count" } ] }
        """);

        Assert.Contains("Pivot measure needs a number", Reasons(await ImpactAsync(seed, _revenue, DatasetColumnType.String)));
        Assert.Empty((await ImpactAsync(seed, _region, DatasetColumnType.Int)).Breaks);
        Assert.Empty((await ImpactAsync(seed, _notes, DatasetColumnType.Int)).Breaks);
    }

    [Fact]
    public async Task A_table_column_with_tolerance_needs_a_number_but_a_plain_or_sorted_one_does_not()
    {
        var seed = await SeedAsync();
        await AddWidgetAsync(seed.Tab, WidgetType.DataTable, $$"""
        { "type": "dataTable", "sortColumnId": "{{_region}}",
          "columns": [ { "columnId": "{{_region}}" },
                       { "columnId": "{{_revenue}}", "tolerance": { "sourceDatasetId": 9, "minColumnId": "{{Guid.NewGuid()}}", "maxColumnId": "{{Guid.NewGuid()}}" } } ] }
        """);

        Assert.Contains("Table column needs a number", Reasons(await ImpactAsync(seed, _revenue, DatasetColumnType.String)));
        Assert.Empty((await ImpactAsync(seed, _region, DatasetColumnType.Int)).Breaks);
    }

    [Fact]
    public async Task A_column_a_tolerance_reads_as_a_limit_needs_a_number_but_its_match_identifier_does_not()
    {
        var seed = await SeedAsync();
        await AddWidgetAsync(seed.Tab, WidgetType.DataTable, $$"""
        { "type": "dataTable", "columns": [ { "columnId": "{{Guid.NewGuid()}}",
            "tolerance": { "sourceDatasetId": {{seed.Data.Id}}, "minColumnId": "{{_revenue}}", "maxColumnId": "{{_notes}}",
                           "match": { "columnId": "{{Guid.NewGuid()}}", "sourceColumnId": "{{_region}}" } } } ] }
        """);

        Assert.Contains("Tolerance limit (min) needs a number", Reasons(await ImpactAsync(seed, _revenue, DatasetColumnType.String)));
        // A text column already used as a limit was broken before any change, so a change isn't blamed for it.
        Assert.Empty((await ImpactAsync(seed, _notes, DatasetColumnType.Bool)).Breaks);
        Assert.Empty((await ImpactAsync(seed, _region, DatasetColumnType.Int)).Breaks);
    }

    [Fact]
    public async Task A_filter_condition_breaks_when_the_new_type_does_not_offer_its_operator()
    {
        var seed = await SeedAsync();
        await AddWidgetAsync(seed.Tab, WidgetType.DataTable, $$"""
        { "type": "dataTable", "filter": {{FilterOn(Condition(_region, "contains", "North"), Condition(_region, "equals", "5"))}} }
        """);

        var reason = Assert.Single(Reasons(await ImpactAsync(seed, _region, DatasetColumnType.Int)));

        Assert.Contains("can't be used on whole-number columns", reason);
    }

    [Fact]
    public async Task A_filter_value_that_will_not_parse_as_the_new_type_breaks()
    {
        var seed = await SeedAsync();
        await AddWidgetAsync(seed.Tab, WidgetType.DataTable, $$"""
        { "type": "dataTable", "filter": {{FilterOn(Condition(_region, "equals", "North"))}} }
        """);

        Assert.Contains("Filter condition value \"North\" isn't a number", Reasons(await ImpactAsync(seed, _region, DatasetColumnType.Int)));
        Assert.Contains("Filter condition value \"North\" isn't a date", Reasons(await ImpactAsync(seed, _region, DatasetColumnType.DateTime)));
    }

    [Fact]
    public async Task A_number_filter_stays_valid_across_number_types_but_breaks_on_text()
    {
        var seed = await SeedAsync();
        await AddWidgetAsync(seed.Tab, WidgetType.DataTable, $$"""
        { "type": "dataTable", "filter": {{FilterOn(Condition(_revenue, "greaterThan", "5"))}} }
        """);

        Assert.Empty((await ImpactAsync(seed, _revenue, DatasetColumnType.Int)).Breaks);
        Assert.Single(Reasons(await ImpactAsync(seed, _revenue, DatasetColumnType.String)));
    }

    [Fact]
    public async Task A_filter_that_is_already_broken_is_not_blamed_on_the_type_change()
    {
        var seed = await SeedAsync();
        // "contains" was never valid on a decimal column, and still isn't valid on a whole-number one.
        await AddWidgetAsync(seed.Tab, WidgetType.DataTable, $$"""
        { "type": "dataTable", "filter": {{FilterOn(Condition(_revenue, "contains", "x"))}} }
        """);

        Assert.Empty((await ImpactAsync(seed, _revenue, DatasetColumnType.Int)).Breaks);
    }

    [Fact]
    public async Task Page_filters_are_checked_too_and_report_as_the_report_filter()
    {
        var seed = await SeedAsync();
        seed.Draft.FiltersJson = $$"""[ { "datasetId": {{seed.Data.Id}}, "filter": {{FilterOn(Condition(_region, "contains", "N"))}} } ]""";
        await Db.SaveChangesAsync();

        var broken = Assert.Single((await ImpactAsync(seed, _region, DatasetColumnType.Int)).Breaks);

        Assert.Equal(ColumnUseKind.ReportFilter, broken.Kind);
    }

    [Fact]
    public async Task An_unchanged_type_breaks_nothing_and_an_unknown_column_or_dataset_is_null()
    {
        var seed = await SeedAsync();
        await AddWidgetAsync(seed.Tab, WidgetType.DataTable, $$"""{ "type": "dataTable", "filter": {{FilterOn(Condition(_region, "contains", "N"))}} }""");

        var same = await ImpactAsync(seed, _region, DatasetColumnType.String);

        Assert.Empty(same.Breaks);
        Assert.Equal(DatasetColumnType.String, same.From);
        Assert.Null(await Service().GetTypeChangeImpactAsync(seed.Data.Id, Guid.NewGuid(), DatasetColumnType.Int));
        Assert.Null(await Service().GetTypeChangeImpactAsync(-1, _region, DatasetColumnType.Int));
    }
}
