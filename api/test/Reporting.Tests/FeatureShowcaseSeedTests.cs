using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Repositories;
using Reporting.DAL.Widgets;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// Guards the hand-authored config JSON in <see cref="DbSeeder.SeedFeatureShowcase"/>: seeds it into a
/// real (SQLite) provider, then checks every widget config parses as JSON, the combination chart carries
/// a bar binding and a line binding across two value axes, and the report-level filter deserialises to
/// the shape the app reads back. A malformed brace or a renamed field would fail here rather than only
/// showing up as a blank widget in the browser.
/// </summary>
public class FeatureShowcaseSeedTests : IDisposable
{
    private static readonly JsonSerializerOptions FilterOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        AllowOutOfOrderMetadataProperties = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    private readonly SqliteConnection _connection;
    private readonly ReportingDbContext _db;

    public FeatureShowcaseSeedTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        using (var pragma = _connection.CreateCommand())
        {
            pragma.CommandText = "PRAGMA foreign_keys = OFF";
            pragma.ExecuteNonQuery();
        }

        var options = new DbContextOptionsBuilder<ReportingDbContext>()
            .UseSqlite(_connection)
            .Options;
        _db = new ReportingDbContext(options);
        _db.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    [Fact]
    public void Seeds_a_six_tab_report_whose_every_widget_config_is_valid_json()
    {
        DbSeeder.SeedFeatureShowcase(_db);

        var revision = LoadRevision();
        var tabs = revision.Tabs.OrderBy(t => t.Order).ToList();
        Assert.Equal(6, tabs.Count);

        var widgets = tabs.SelectMany(t => t.Widgets).ToList();

        // Every hand-written config blob must be well-formed JSON carrying its widget's discriminator.
        foreach (var widget in widgets)
        {
            using var doc = JsonDocument.Parse(widget.ConfigJson);
            Assert.True(doc.RootElement.TryGetProperty("type", out _), $"config for {widget.Type} has no type");
        }

        // The full sweep of widget kinds the tour is meant to show.
        var types = widgets.Select(w => w.Type).ToList();
        foreach (var expected in new[]
                 {
                     WidgetType.StaticText, WidgetType.DataTable, WidgetType.PivotTable, WidgetType.ScatterChart,
                     WidgetType.LineChart, WidgetType.BarChart, WidgetType.ComboChart, WidgetType.BoxPlot,
                     WidgetType.Histogram, WidgetType.XBarRChart, WidgetType.Kpi,
                 })
        {
            Assert.Contains(expected, types);
        }
    }

    [Fact]
    public void Kpi_tab_demonstrates_every_value_source_comparison_and_display_combination()
    {
        DbSeeder.SeedFeatureShowcase(_db);

        var revision = LoadRevision();
        var kpiTab = revision.Tabs.Single(t => t.Name == "KPIs");
        var kpis = kpiTab.Widgets.Where(w => w.Type == WidgetType.Kpi)
            .Select(w => JsonDocument.Parse(w.ConfigJson).RootElement)
            .ToList();

        Assert.Equal(8, kpis.Count);
        Assert.Contains(kpis, k => k.GetProperty("valueSource").GetString() == "aggregate");
        Assert.Contains(kpis, k => k.GetProperty("valueSource").GetString() == "toleranceOutOfLimits");
        Assert.Contains(kpis, k => k.GetProperty("comparisonMode").GetString() == "fixedTarget");
        Assert.Contains(kpis, k => k.GetProperty("comparisonMode").GetString() == "previousPeriod");
        Assert.Contains(kpis, k => k.GetProperty("thresholdsEnabled").GetBoolean());
        Assert.Contains(kpis, k => k.GetProperty("showSparkline").GetBoolean());
        Assert.Contains(kpis, k => k.GetProperty("showAsMeter").GetBoolean());
        Assert.Contains(kpis, k => k.GetProperty("groupByColumnId").ValueKind != JsonValueKind.Null);
    }

    [Fact]
    public void Combination_chart_has_a_bar_and_a_line_binding_on_two_value_axes()
    {
        DbSeeder.SeedFeatureShowcase(_db);

        var combo = LoadRevision().Tabs.SelectMany(t => t.Widgets).Single(w => w.Type == WidgetType.ComboChart);
        using var doc = JsonDocument.Parse(combo.ConfigJson);
        var root = doc.RootElement;

        var renderKinds = root.GetProperty("bindings").EnumerateArray()
            .Select(b => b.GetProperty("renderAs").GetString())
            .ToList();
        Assert.Equal(2, renderKinds.Count);
        Assert.Contains("bar", renderKinds);
        Assert.Contains("line", renderKinds);

        // Dual axis: the bars and the line each read on their own scale.
        Assert.Equal(2, root.GetProperty("yAxes").GetArrayLength());
        Assert.Equal("average", root.GetProperty("aggregate").GetString());
    }

    [Fact]
    public void Report_level_filter_excludes_the_rnd_bench_builds()
    {
        DbSeeder.SeedFeatureShowcase(_db);

        var revision = LoadRevision();
        var filters = JsonSerializer.Deserialize<List<ReportFilterDto>>(revision.FiltersJson, FilterOptions);

        var filter = Assert.Single(filters!);
        var condition = Assert.IsType<FilterConditionDto>(Assert.Single(filter.Filter.Children));
        Assert.Equal(FilterOperator.NotEquals, condition.Operator);
        Assert.Equal("R&D Bench", Assert.Single(condition.Values));
    }

    [Fact]
    public async Task Combination_chart_cost_binding_aggregates_to_one_bar_per_engine()
    {
        DbSeeder.SeedFeatureShowcase(_db);

        var revision = LoadRevision();
        var dataset = revision.Datasets.Single(d => d.Name == "Engine Build Log");
        Guid Ref(string name) => dataset.Columns.First(c => c.Name == name).RefId;

        // The combo's bar binding runs through the bar-chart query — the same path the client uses.
        var result = await new BarChartQueryService(_db, new ChartToleranceBands(new ToleranceResolver(_db)), new DatasetResolver(_db))
            .QueryForBarChartAsync(dataset.Id, new BarChartQueryDto
            {
                CategoryColumnId = Ref("Engine Type"),
                ValueColumnIds = [Ref("Build Cost")],
                Aggregate = Aggregate.Average,
            });

        // Four engine types across the seeded builds (the R&D bench rows are also V8, so still four).
        Assert.Equal(4, result!.Categories.Count);
        Assert.All(result.Series.Single().Values, v => Assert.NotNull(v));
    }

    [Fact]
    public async Task XBarR_chart_subgroups_clearance_by_inspector_with_a_spec_band()
    {
        DbSeeder.SeedFeatureShowcase(_db);

        var revision = LoadRevision();
        var xbarR = revision.Tabs.SelectMany(t => t.Widgets).Single(w => w.Type == WidgetType.XBarRChart);
        using (var doc = JsonDocument.Parse(xbarR.ConfigJson))
        {
            Assert.Single(doc.RootElement.GetProperty("toleranceBands").EnumerateArray());
        }

        var dataset = revision.Datasets.Single(d => d.Name == "Engine Build Log");
        Guid Ref(string name) => dataset.Columns.First(c => c.Name == name).RefId;

        // The control chart's own binding runs through the real Xbar-R query — the same path the
        // client uses — and should subgroup cleanly into the four seeded inspectors.
        var result = await new XBarRChartQueryService(_db, new ChartToleranceBands(new ToleranceResolver(_db)), new DatasetResolver(_db))
            .QueryForXBarRChartAsync(dataset.Id, new XBarRChartQueryDto
            {
                CategoryColumnId = Ref("Inspector"),
                ValueColumnId = Ref("Main Bearing Clearance"),
            });

        Assert.Equal(4, result!.Categories.Count);
        Assert.All(result.Subgroups, s => Assert.True(s.Count > 1));
        // Every build is bound to an inspector, so nothing should be lost into a missing group.
        Assert.Equal(result.MatchedRowCount, result.Subgroups.Sum(s => s.Count));
    }

    [Fact]
    public async Task Filtered_dataset_returns_only_the_builds_that_needed_rework()
    {
        DbSeeder.SeedFeatureShowcase(_db);

        var revision = LoadRevision();
        var baseDataset = revision.Datasets.Single(d => d.Name == "Engine Build Log");
        var filtered = revision.Datasets.Single(d => d.Name == "High-Rework Builds");
        Assert.Equal(DatasetSourceIds.Filtered, filtered.DatasetSourceId);

        var reworkColumn = baseDataset.Columns.Single(c => c.Name == "Rework Count");
        var expectedCount = await _db.DatasetRows.CountAsync(r =>
            r.DatasetId == baseDataset.Id
            && r.Cells.Any(c => c.ColumnId == reworkColumn.Id && c.NumberValue > 0));
        Assert.True(expectedCount > 0, "the seeded data should include at least one reworked build");

        // Reads through the real repository path — resolver, filter translation and all — the same
        // way the dataset editor and any widget bound to the filtered dataset would.
        var repo = new DatasetRepository(
            _db,
            new Reporting.DAL.Formulas.FormulaCalculationService(_db, new Reporting.DAL.Formulas.Catalogue.FormulaFunctionCatalogueLoader(_db)),
            new DatasetResolver(_db));

        var schema = await repo.GetSchemaAsync(filtered.Id);
        Assert.Equal(DatasetSourceKey.Filtered, schema!.Source);
        // The filtered dataset owns no columns of its own — its schema is inherited from the base.
        Assert.Equal(baseDataset.Columns.Count, schema.Columns.Count);

        var result = await repo.QueryAsync(filtered.Id, null);
        Assert.Equal(expectedCount, result!.TotalRowCount);
        Assert.Equal(expectedCount, result.MatchedRowCount);
        Assert.All(result.Rows, row => Assert.True(int.Parse(row.Values[reworkColumn.RefId]) > 0));
    }

    private ReportRevision LoadRevision() =>
        _db.Reports
            .Include(r => r.Revisions).ThenInclude(rev => rev.Tabs).ThenInclude(t => t.Widgets)
            .Include(r => r.Revisions).ThenInclude(rev => rev.Datasets).ThenInclude(d => d.Columns)
            .Single(r => r.Name == "Engine Build — Feature Tour")
            .Revisions.Single();
}
