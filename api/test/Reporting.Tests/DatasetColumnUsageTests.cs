using Reporting.Abstractions;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// Removing a dataset column breaks whatever in the report refers to it, so the usage read must find
/// every kind of reference — table columns, chart bindings, tolerance, filters, pivots — without
/// knowing each widget's shape, and stay inside the revision that owns the dataset.
/// </summary>
public class DatasetColumnUsageTests : SqliteDbTestBase
{
    private readonly Guid _region = Guid.NewGuid();
    private readonly Guid _revenue = Guid.NewGuid();
    private readonly Guid _unused = Guid.NewGuid();

    public DatasetColumnUsageTests() : base(foreignKeys: false) { }

    private DatasetColumnUsageService Service() => new(Db);

    private sealed record Seed(ReportRevision Draft, Dataset Data, Tab Tab);

    private async Task<Seed> SeedAsync(string filtersJson = "[]")
    {
        var report = new Report { RefId = Guid.NewGuid(), Number = 1, Name = "R", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        Db.Reports.Add(report);
        await Db.SaveChangesAsync();

        var draft = new ReportRevision { RefId = Guid.NewGuid(), ReportId = report.Id, Kind = RevisionKind.Draft, CreatedAt = DateTime.UtcNow, FiltersJson = filtersJson };
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
                new DatasetColumn { RefId = _unused, Name = "Notes", Type = DatasetColumnType.String, Order = 2 },
            },
        };
        Db.Datasets.Add(data);
        await Db.SaveChangesAsync();
        return new Seed(draft, data, tab);
    }

    private async Task<Guid> AddWidgetAsync(Tab tab, WidgetType type, string configJson, int y = 0)
    {
        var widget = new Widget { RefId = Guid.NewGuid(), TabId = tab.Id, Type = type, Y = y, W = 4, H = 4, ConfigJson = configJson };
        Db.Widgets.Add(widget);
        await Db.SaveChangesAsync();
        return widget.RefId;
    }

    private static ColumnUsageDto For(DatasetColumnUsageDto usage, Guid column) =>
        usage.Columns.Single(c => c.ColumnId == column);

    [Fact]
    public async Task A_table_reports_each_way_it_uses_a_column()
    {
        var seed = await SeedAsync();
        var tableId = await AddWidgetAsync(seed.Tab, WidgetType.DataTable, $$"""
        {
          "type": "dataTable", "title": "Sales log", "datasetId": {{seed.Data.Id}},
          "sortColumnId": "{{_region}}",
          "columns": [
            { "columnId": "{{_region}}" },
            { "columnId": "{{_revenue}}", "tolerance": { "sourceDatasetId": 99, "minColumnId": "{{Guid.NewGuid()}}", "maxColumnId": "{{Guid.NewGuid()}}" } }
          ],
          "filter": { "kind": "group", "join": "and", "children": [
            { "kind": "condition", "columnId": "{{_region}}", "operator": "equals", "values": ["North"] } ] }
        }
        """);

        var usage = (await Service().GetAsync(seed.Data.Id))!;

        var region = Assert.Single(For(usage, _region).Uses);
        Assert.Equal(ColumnUseKind.Widget, region.Kind);
        Assert.Equal(tableId, region.WidgetId);
        Assert.Equal("Sales log", region.WidgetTitle);
        Assert.Equal(WidgetType.DataTable, region.WidgetType);
        Assert.Equal("Overview", region.TabName);
        Assert.Contains("Table column", region.Roles);
        Assert.Contains("Sort column", region.Roles);
        Assert.Contains("Filter condition", region.Roles);
        Assert.Equal(["Table column"], Assert.Single(For(usage, _revenue).Uses).Roles);
    }

    [Fact]
    public async Task A_column_a_tolerance_uses_as_a_limits_column_is_found_in_the_limits_dataset()
    {
        var seed = await SeedAsync();
        // This dataset plays the limits role: another widget's tolerance points at its columns.
        await AddWidgetAsync(seed.Tab, WidgetType.DataTable, $$"""
        { "type": "dataTable", "title": "Readings", "datasetId": 42,
          "columns": [ { "columnId": "{{Guid.NewGuid()}}",
            "tolerance": { "sourceDatasetId": {{seed.Data.Id}},
              "match": { "columnId": "{{Guid.NewGuid()}}", "sourceColumnId": "{{_region}}" },
              "minColumnId": "{{_revenue}}", "maxColumnId": "{{_unused}}" } } ] }
        """);

        var usage = (await Service().GetAsync(seed.Data.Id))!;

        Assert.Equal(["Tolerance match (limits column)"], Assert.Single(For(usage, _region).Uses).Roles);
        Assert.Equal(["Tolerance limit (min)"], Assert.Single(For(usage, _revenue).Uses).Roles);
        Assert.Equal(["Tolerance limit (max)"], Assert.Single(For(usage, _unused).Uses).Roles);
    }

    [Fact]
    public async Task A_chart_uses_columns_as_axes_series_tooltips_bands_and_filters()
    {
        var seed = await SeedAsync();
        await AddWidgetAsync(seed.Tab, WidgetType.BarChart, $$"""
        {
          "type": "barChart", "title": "Revenue by region",
          "bindings": [ { "id": "b1", "datasetId": {{seed.Data.Id}},
            "xColumnId": "{{_region}}", "yColumnId": "{{_revenue}}", "valueColumnIds": ["{{_revenue}}"],
            "seriesColumnId": "{{_unused}}",
            "filter": { "kind": "group", "join": "and", "children": [
              { "kind": "condition", "columnId": "{{_region}}", "operator": "equals", "values": ["N"] } ] } } ],
          "tooltipColumns": [ { "columnId": "{{_unused}}" } ],
          "toleranceBands": [ { "id": "t1", "axis": "y", "sourceDatasetId": {{seed.Data.Id}}, "minColumnId": "{{_revenue}}", "maxColumnId": "{{Guid.NewGuid()}}" } ]
        }
        """);

        var usage = (await Service().GetAsync(seed.Data.Id))!;

        var region = Assert.Single(For(usage, _region).Uses).Roles;
        Assert.Contains("X / category column", region);
        Assert.Contains("Filter condition", region);
        var revenue = Assert.Single(For(usage, _revenue).Uses).Roles;
        Assert.Contains("Y / value column", revenue);
        Assert.Contains("Value column", revenue);
        Assert.Contains("Tolerance limit (min)", revenue);
        var unused = Assert.Single(For(usage, _unused).Uses).Roles;
        Assert.Contains("Colour-by column", unused);
        Assert.Contains("Tooltip", unused);
    }

    [Fact]
    public async Task A_pivot_uses_columns_as_row_groups_and_measures()
    {
        var seed = await SeedAsync();
        await AddWidgetAsync(seed.Tab, WidgetType.PivotTable, $$"""
        { "type": "pivotTable", "title": "Summary", "datasetId": {{seed.Data.Id}},
          "rowFields": ["{{_region}}"],
          "measures": [ { "id": "m1", "columnId": "{{_revenue}}", "aggregate": "sum" } ] }
        """);

        var usage = (await Service().GetAsync(seed.Data.Id))!;

        Assert.Equal(["Pivot row grouping"], Assert.Single(For(usage, _region).Uses).Roles);
        Assert.Equal(["Pivot measure"], Assert.Single(For(usage, _revenue).Uses).Roles);
    }

    [Fact]
    public async Task Repeated_uses_in_one_widget_are_counted_and_an_unused_column_is_left_out()
    {
        var seed = await SeedAsync();
        await AddWidgetAsync(seed.Tab, WidgetType.DataTable, $$"""
        { "type": "dataTable", "datasetId": {{seed.Data.Id}}, "columns": [],
          "filter": { "kind": "group", "join": "and", "children": [
            { "kind": "condition", "columnId": "{{_region}}", "operator": "equals", "values": ["A"] },
            { "kind": "condition", "columnId": "{{_region}}", "operator": "equals", "values": ["B"] } ] } }
        """);

        var usage = (await Service().GetAsync(seed.Data.Id))!;

        Assert.Equal(["Filter condition ×2"], Assert.Single(For(usage, _region).Uses).Roles);
        Assert.DoesNotContain(usage.Columns, c => c.ColumnId == _unused);
        Assert.DoesNotContain(usage.Columns, c => c.ColumnId == _revenue);
    }

    [Fact]
    public async Task Page_filters_for_this_dataset_count_but_those_for_another_dataset_do_not()
    {
        var seed = await SeedAsync();
        var filter = $$"""{ "kind": "group", "join": "and", "children": [ { "kind": "condition", "columnId": "{{_region}}", "operator": "equals", "values": ["N"] } ] }""";
        seed.Draft.FiltersJson = $$"""[ { "datasetId": {{seed.Data.Id}}, "filter": {{filter}} }, { "datasetId": {{seed.Data.Id + 1000}}, "filter": {{filter}} } ]""";
        await Db.SaveChangesAsync();

        var use = Assert.Single(For((await Service().GetAsync(seed.Data.Id))!, _region).Uses);

        Assert.Equal(ColumnUseKind.ReportFilter, use.Kind);
        Assert.Null(use.WidgetId);
        Assert.Equal(["Filter condition"], use.Roles);
    }

    [Fact]
    public async Task Widgets_in_another_revision_do_not_count()
    {
        var seed = await SeedAsync();
        // A published copy of the report reuses the same column ids (RefIds survive a copy) but has its own dataset.
        var published = new ReportRevision { RefId = Guid.NewGuid(), ReportId = seed.Draft.ReportId, Kind = RevisionKind.Published, VersionNumber = 1, CreatedAt = DateTime.UtcNow };
        Db.ReportRevisions.Add(published);
        await Db.SaveChangesAsync();
        var publishedTab = new Tab { RefId = Guid.NewGuid(), ReportRevisionId = published.Id, Name = "Overview", Order = 0 };
        Db.Tabs.Add(publishedTab);
        await Db.SaveChangesAsync();
        await AddWidgetAsync(publishedTab, WidgetType.DataTable, $$"""{ "type": "dataTable", "columns": [ { "columnId": "{{_region}}" } ] }""");

        var usage = (await Service().GetAsync(seed.Data.Id))!;

        Assert.Empty(usage.Columns);
    }

    [Fact]
    public async Task Unreadable_config_is_skipped_and_an_unknown_dataset_is_null()
    {
        var seed = await SeedAsync();
        await AddWidgetAsync(seed.Tab, WidgetType.DataTable, "{ not json");

        Assert.Empty((await Service().GetAsync(seed.Data.Id))!.Columns);
        Assert.Null(await Service().GetAsync(-1));
    }

    [Fact]
    public async Task Uses_follow_the_tab_and_widget_order()
    {
        var seed = await SeedAsync();
        await AddWidgetAsync(seed.Tab, WidgetType.DataTable, $$"""{ "title": "Lower", "columns": [ { "columnId": "{{_region}}" } ] }""", y: 10);
        await AddWidgetAsync(seed.Tab, WidgetType.DataTable, $$"""{ "title": "Upper", "columns": [ { "columnId": "{{_region}}" } ] }""", y: 0);

        var titles = For((await Service().GetAsync(seed.Data.Id))!, _region).Uses.Select(u => u.WidgetTitle).ToList();

        Assert.Equal(["Upper", "Lower"], titles);
    }

    [Fact]
    public void An_option_the_rules_do_not_know_is_described_by_its_own_name()
    {
        Assert.Equal("Some new option", ColumnReferenceScanner.Describe(["someNewOption"]));
        Assert.Equal("Column", ColumnReferenceScanner.Describe([]));
    }
}
