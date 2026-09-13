using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
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
    public void Seeds_a_four_tab_report_whose_every_widget_config_is_valid_json()
    {
        DbSeeder.SeedFeatureShowcase(_db);

        var revision = LoadRevision();
        var tabs = revision.Tabs.OrderBy(t => t.Order).ToList();
        Assert.Equal(4, tabs.Count);

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
                     WidgetType.Histogram,
                 })
        {
            Assert.Contains(expected, types);
        }
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
        var result = await new WidgetQueryRepository(_db, new ToleranceResolver(_db))
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

    private ReportRevision LoadRevision() =>
        _db.Reports
            .Include(r => r.Revisions).ThenInclude(rev => rev.Tabs).ThenInclude(t => t.Widgets)
            .Include(r => r.Revisions).ThenInclude(rev => rev.Datasets).ThenInclude(d => d.Columns)
            .Single(r => r.Name == "Engine Build — Feature Tour")
            .Revisions.Single();
}
