using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// Guards the hand-authored config JSON in <see cref="DbSeeder.SeedCrossReferenceShowcase"/>: seeds it
/// into a real (SQLite) provider, then checks every widget config parses as JSON, the report-level
/// filter carries one entry per dataset, and the overlay chart's two bindings each point at a
/// different dataset — the shape the multi-dataset filtering/charting showcase depends on.
/// </summary>
public class CrossReferenceShowcaseSeedTests : IDisposable
{
    private static readonly JsonSerializerOptions FilterOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        AllowOutOfOrderMetadataProperties = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    private readonly SqliteConnection _connection;
    private readonly ReportingDbContext _db;

    public CrossReferenceShowcaseSeedTests()
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
    public void Seeds_three_datasets_with_valid_widget_configs()
    {
        DbSeeder.SeedCrossReferenceShowcase(_db);

        var revision = LoadRevision();
        Assert.Equal(3, revision.Datasets.Count);
        Assert.Contains(revision.Datasets, d => d.Name == "Engine Builds");
        Assert.Contains(revision.Datasets, d => d.Name == "Engine Test Runs");
        Assert.Contains(revision.Datasets, d => d.Name == "Engine Concessions");

        var widgets = revision.Tabs.SelectMany(t => t.Widgets).ToList();
        foreach (var widget in widgets)
        {
            using var doc = JsonDocument.Parse(widget.ConfigJson);
            Assert.True(doc.RootElement.TryGetProperty("type", out _), $"config for {widget.Type} has no type");
        }

        Assert.Equal(3, widgets.Count(w => w.Type == WidgetType.DataTable));
        Assert.Single(widgets, w => w.Type == WidgetType.LineChart);
    }

    [Fact]
    public void Report_level_filter_covers_all_three_datasets()
    {
        DbSeeder.SeedCrossReferenceShowcase(_db);

        var revision = LoadRevision();
        var filters = JsonSerializer.Deserialize<List<ReportFilterDto>>(revision.FiltersJson, FilterOptions)!;
        var datasetIds = revision.Datasets.Select(d => d.Id).OrderBy(id => id).ToList();

        Assert.Equal(3, filters.Count);
        Assert.Equal(datasetIds, filters.Select(f => f.DatasetId).OrderBy(id => id).ToList());

        // Every filter narrows to the same V8/V12 builds — Engine Builds by its two Engine Type
        // values, the other two (no Engine Type column) by the five equivalent Job Numbers.
        foreach (var filter in filters)
        {
            var condition = Assert.IsType<FilterConditionDto>(Assert.Single(filter.Filter.Children));
            Assert.Equal(FilterOperator.In, condition.Operator);
            Assert.True(condition.Values.Count is 2 or 5, $"unexpected value count {condition.Values.Count}");
        }
    }

    [Fact]
    public void Overlay_chart_binds_two_different_datasets_on_two_axes()
    {
        DbSeeder.SeedCrossReferenceShowcase(_db);

        var revision = LoadRevision();
        var chart = revision.Tabs.SelectMany(t => t.Widgets).Single(w => w.Type == WidgetType.LineChart);
        using var doc = JsonDocument.Parse(chart.ConfigJson);
        var root = doc.RootElement;

        var bindingDatasetIds = root.GetProperty("bindings").EnumerateArray()
            .Select(b => b.GetProperty("datasetId").GetInt32())
            .Distinct()
            .ToList();
        Assert.Equal(2, bindingDatasetIds.Count);
        Assert.Equal(2, root.GetProperty("yAxes").GetArrayLength());
    }

    private ReportRevision LoadRevision() =>
        _db.Reports
            .Include(r => r.Revisions).ThenInclude(rev => rev.Tabs).ThenInclude(t => t.Widgets)
            .Include(r => r.Revisions).ThenInclude(rev => rev.Datasets).ThenInclude(d => d.Columns)
            .Single(r => r.Name == "Engine Build Cross-Reference")
            .Revisions.Single();
}
