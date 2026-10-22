using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Repositories;
using Reporting.DAL.Widgets;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// Seeds Performance at Scale at a few hundred rows through the EF fallback writer (SQL Server bulk-copies
/// the full size): every row gets every cell, the values are the same on every seed, and the widgets query.
/// </summary>
public class PerformanceShowcaseSeedTests() : SqliteDbTestBase(foreignKeys: false)
{
    private static readonly PerformanceShowcaseSizes Small = new(2_400, 300);

    [Fact]
    public void Seeds_each_generated_dataset_at_its_requested_size_with_every_cell()
    {
        DbSeeder.SeedPerformanceShowcase(Db, Small);

        AssertFilled("Machine Sensor Readings", 2_400, 6);
        AssertFilled("Dyno Test Runs", 300, 8);
        Assert.False(DbSeeder.NeedsPerformanceShowcase(Db));
    }

    [Fact]
    public void Seeding_again_does_nothing()
    {
        DbSeeder.SeedPerformanceShowcase(Db, Small);
        DbSeeder.SeedPerformanceShowcase(Db, Small);

        Assert.Single(Db.Reports.Where(r => r.Name == "Performance at Scale"));
        Assert.Equal(2_700 + 1, Db.DatasetRows.Count());
    }

    [Fact]
    public void Generated_values_are_the_same_on_every_seed()
    {
        DbSeeder.SeedPerformanceShowcase(Db, Small);
        var first = Temperatures(Db);

        using var other = new SecondDatabase();
        DbSeeder.SeedPerformanceShowcase(other.Context, Small);

        Assert.Equal(first, Temperatures(other.Context));
    }

    [Fact]
    public void Widget_configs_are_valid_json_and_the_report_is_published()
    {
        DbSeeder.SeedPerformanceShowcase(Db, Small);

        var revision = Db.ReportRevisions.Include(r => r.Tabs).ThenInclude(t => t.Widgets).Single();
        Assert.Equal(RevisionKind.Published, revision.Kind);
        Assert.Equal(6, revision.Tabs.Count);
        foreach (var widget in revision.Tabs.SelectMany(t => t.Widgets))
        {
            using var doc = JsonDocument.Parse(widget.ConfigJson);
            Assert.True(doc.RootElement.TryGetProperty("type", out _));
        }
    }

    [Fact]
    public async Task Top_ten_bar_rolls_the_other_machines_into_one_category()
    {
        DbSeeder.SeedPerformanceShowcase(Db, Small);
        var dataset = Db.Datasets.Include(d => d.Columns).Single(d => d.Name == "Machine Sensor Readings");
        var temp = Ref(dataset, "Spindle Temp");

        var result = await new BarChartQueryService(Db, new ChartToleranceBands(new ToleranceResolver(Db)), new DatasetResolver(Db))
            .QueryForBarChartAsync(dataset.Id, new BarChartQueryDto
            {
                CategoryColumnId = Ref(dataset, "Machine"),
                ValueColumnIds = [temp],
                Aggregate = Aggregate.Average,
                Sort = new ChartSort { By = ChartSortBy.Column, ColumnId = temp, Aggregate = SortAggregate.Average, Descending = true, Limit = 10, ShowOther = true },
            });

        Assert.Equal(11, result!.Categories.Count);
    }

    private void AssertFilled(string name, int rows, int columns)
    {
        var dataset = Db.Datasets.Include(d => d.Columns).Single(d => d.Name == name);
        Assert.Equal(columns, dataset.Columns.Count);
        Assert.Equal(rows, Db.DatasetRows.Count(r => r.DatasetId == dataset.Id));
        Assert.Equal(rows * columns, Db.DatasetCells.Count(c => c.Row!.DatasetId == dataset.Id));
    }

    private static List<double?> Temperatures(ReportingDbContext db)
    {
        var dataset = db.Datasets.Include(d => d.Columns).Single(d => d.Name == "Machine Sensor Readings");
        var column = dataset.Columns.Single(c => c.Name == "Spindle Temp");
        return db.DatasetCells.Where(c => c.ColumnId == column.Id).OrderBy(c => c.RowId).Select(c => c.NumberValue).ToList();
    }

    private static Guid Ref(Dataset dataset, string name)
    {
        return dataset.Columns.Single(c => c.Name == name).RefId;
    }
}
