using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Widgets;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// Exercises <see cref="WidgetQueryRepository.QueryForBarChartAsync"/> against a real (SQLite)
/// relational provider, so the per-measure GROUP BY it builds is proven to translate to SQL and
/// the multi-measure / split fan-out (a series per measure × colour-by key, aligned to a shared
/// category axis) is proven correct.
/// </summary>
public class BarChartQueryTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly ReportingDbContext _db;

    public BarChartQueryTests()
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

    private WidgetQueryRepository Repo() => new(_db, new ToleranceResolver(_db));

    [Fact]
    public async Task QueryForBarChart_sums_a_single_measure_per_category()
    {
        var categoryRef = Guid.NewGuid();
        var revRef = Guid.NewGuid();
        var dataset = NewDataset(
            (categoryRef, "Region", DatasetColumnType.String),
            (revRef, "Revenue", DatasetColumnType.Double));
        var cat = dataset.Columns[0].Id;
        var rev = dataset.Columns[1].Id;

        AddRow(dataset.Id, cat, "North", (rev, 10));
        AddRow(dataset.Id, cat, "North", (rev, 20));
        AddRow(dataset.Id, cat, "South", (rev, 5));
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForBarChartAsync(dataset.Id, new BarChartQueryDto
        {
            CategoryColumnId = categoryRef,
            ValueColumnIds = [revRef],
            Aggregate = Aggregate.Sum,
        });

        Assert.Equal(["North", "South"], result!.Categories);
        var series = Assert.Single(result.Series);
        Assert.Equal("", series.Label); // no split column
        Assert.Equal(revRef, series.ValueColumnId);
        Assert.Equal("Revenue", series.ValueColumnLabel);
        Assert.Equal([30d, 5d], series.Values);
    }

    [Fact]
    public async Task QueryForBarChart_returns_a_series_per_measure_aligned_to_categories()
    {
        var categoryRef = Guid.NewGuid();
        var revRef = Guid.NewGuid();
        var costRef = Guid.NewGuid();
        var dataset = NewDataset(
            (categoryRef, "Region", DatasetColumnType.String),
            (revRef, "Revenue", DatasetColumnType.Double),
            (costRef, "Cost", DatasetColumnType.Double));
        var cat = dataset.Columns[0].Id;
        var rev = dataset.Columns[1].Id;
        var cost = dataset.Columns[2].Id;

        AddRow(dataset.Id, cat, "North", (rev, 10), (cost, 4));
        AddRow(dataset.Id, cat, "North", (rev, 20), (cost, 6));
        AddRow(dataset.Id, cat, "South", (rev, 5), (cost, 1));
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForBarChartAsync(dataset.Id, new BarChartQueryDto
        {
            CategoryColumnId = categoryRef,
            ValueColumnIds = [revRef, costRef],
            Aggregate = Aggregate.Sum,
        });

        Assert.Equal(["North", "South"], result!.Categories);
        Assert.Equal(2, result.Series.Count);

        // Measure-major order: revenue's series first, then cost's.
        var revenue = result.Series[0];
        Assert.Equal(revRef, revenue.ValueColumnId);
        Assert.Equal("Revenue", revenue.ValueColumnLabel);
        Assert.Equal([30d, 5d], revenue.Values);

        var costSeries = result.Series[1];
        Assert.Equal(costRef, costSeries.ValueColumnId);
        Assert.Equal("Cost", costSeries.ValueColumnLabel);
        Assert.Equal([10d, 1d], costSeries.Values);
    }

    [Fact]
    public async Task QueryForBarChart_splits_each_measure_by_the_series_column()
    {
        var categoryRef = Guid.NewGuid();
        var revRef = Guid.NewGuid();
        var costRef = Guid.NewGuid();
        var lineRef = Guid.NewGuid();
        var dataset = NewDataset(
            (categoryRef, "Region", DatasetColumnType.String),
            (revRef, "Revenue", DatasetColumnType.Double),
            (costRef, "Cost", DatasetColumnType.Double),
            (lineRef, "Line", DatasetColumnType.String));
        var cat = dataset.Columns[0].Id;
        var rev = dataset.Columns[1].Id;
        var cost = dataset.Columns[2].Id;
        var line = dataset.Columns[3].Id;

        AddRow(dataset.Id, cat, "North", (rev, 10), (cost, 4), (line, "X"));
        AddRow(dataset.Id, cat, "North", (rev, 20), (cost, 6), (line, "Y"));
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForBarChartAsync(dataset.Id, new BarChartQueryDto
        {
            CategoryColumnId = categoryRef,
            ValueColumnIds = [revRef, costRef],
            SeriesColumnId = lineRef,
            Aggregate = Aggregate.Sum,
        });

        // Two measures × two split keys = four series.
        Assert.Equal(4, result!.Series.Count);
        var revX = result.Series.Single(s => s.ValueColumnId == revRef && s.Label == "X");
        Assert.Equal([10d], revX.Values);
        var costY = result.Series.Single(s => s.ValueColumnId == costRef && s.Label == "Y");
        Assert.Equal([6d], costY.Values);
    }

    [Fact]
    public async Task QueryForBarChart_count_ignores_measures_and_counts_rows()
    {
        var categoryRef = Guid.NewGuid();
        var revRef = Guid.NewGuid();
        var dataset = NewDataset(
            (categoryRef, "Region", DatasetColumnType.String),
            (revRef, "Revenue", DatasetColumnType.Double));
        var cat = dataset.Columns[0].Id;
        var rev = dataset.Columns[1].Id;

        AddRow(dataset.Id, cat, "North", (rev, 10));
        AddRow(dataset.Id, cat, "North", (rev, 20));
        AddRow(dataset.Id, cat, "South", (rev, 5));
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForBarChartAsync(dataset.Id, new BarChartQueryDto
        {
            CategoryColumnId = categoryRef,
            ValueColumnIds = [revRef], // ignored for Count
            Aggregate = Aggregate.Count,
        });

        var series = Assert.Single(result!.Series);
        Assert.Null(series.ValueColumnId);
        Assert.Equal("", series.ValueColumnLabel);
        Assert.Equal([2d, 1d], series.Values);
    }

    [Fact]
    public async Task QueryForBarChart_leaves_a_gap_where_a_measure_has_no_rows_in_a_category()
    {
        var categoryRef = Guid.NewGuid();
        var revRef = Guid.NewGuid();
        var costRef = Guid.NewGuid();
        var dataset = NewDataset(
            (categoryRef, "Region", DatasetColumnType.String),
            (revRef, "Revenue", DatasetColumnType.Double),
            (costRef, "Cost", DatasetColumnType.Double));
        var cat = dataset.Columns[0].Id;
        var rev = dataset.Columns[1].Id;
        var cost = dataset.Columns[2].Id;

        // Revenue in both regions; cost only in North, so South's cost bar is a gap.
        AddRow(dataset.Id, cat, "North", (rev, 10), (cost, 4));
        AddRow(dataset.Id, cat, "South", (rev, 5));
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForBarChartAsync(dataset.Id, new BarChartQueryDto
        {
            CategoryColumnId = categoryRef,
            ValueColumnIds = [revRef, costRef],
            Aggregate = Aggregate.Sum,
        });

        Assert.Equal(["North", "South"], result!.Categories);
        var costSeries = result.Series.Single(s => s.ValueColumnId == costRef);
        Assert.Equal([4d, null], costSeries.Values);
    }

    [Fact]
    public async Task QueryForBarChart_folds_the_deprecated_single_value_column_id()
    {
        var categoryRef = Guid.NewGuid();
        var revRef = Guid.NewGuid();
        var dataset = NewDataset(
            (categoryRef, "Region", DatasetColumnType.String),
            (revRef, "Revenue", DatasetColumnType.Double));
        var cat = dataset.Columns[0].Id;
        var rev = dataset.Columns[1].Id;

        AddRow(dataset.Id, cat, "North", (rev, 10));
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForBarChartAsync(dataset.Id, new BarChartQueryDto
        {
            CategoryColumnId = categoryRef,
            ValueColumnId = revRef, // legacy single-measure request, ValueColumnIds empty
            Aggregate = Aggregate.Sum,
        });

        var series = Assert.Single(result!.Series);
        Assert.Equal(revRef, series.ValueColumnId);
        Assert.Equal([10d], series.Values);
    }

    private Dataset NewDataset(params (Guid Ref, string Name, DatasetColumnType Type)[] columns)
    {
        var dataset = new Dataset { Name = "D", DatasetSourceId = 1, ReportRevisionId = 1 };
        var order = 0;
        foreach (var (refId, name, type) in columns)
            dataset.Columns.Add(new DatasetColumn { RefId = refId, Name = name, Type = type, Order = order++ });
        _db.Datasets.Add(dataset);
        _db.SaveChanges();
        return dataset;
    }

    private void AddRow(int datasetId, int categoryCol, string category, params (int Col, double Value)[] values)
    {
        var row = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = datasetId };
        row.Cells.Add(new DatasetCell { ColumnId = categoryCol, StringValue = category });
        foreach (var (col, value) in values)
            row.Cells.Add(new DatasetCell { ColumnId = col, NumberValue = value, StringValue = value.ToString() });
        _db.DatasetRows.Add(row);
    }

    private void AddRow(int datasetId, int categoryCol, string category, (int Col, double Value) v1, (int Col, double Value) v2, (int Col, string Text) series)
    {
        var row = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = datasetId };
        row.Cells.Add(new DatasetCell { ColumnId = categoryCol, StringValue = category });
        row.Cells.Add(new DatasetCell { ColumnId = v1.Col, NumberValue = v1.Value, StringValue = v1.Value.ToString() });
        row.Cells.Add(new DatasetCell { ColumnId = v2.Col, NumberValue = v2.Value, StringValue = v2.Value.ToString() });
        row.Cells.Add(new DatasetCell { ColumnId = series.Col, StringValue = series.Text });
        _db.DatasetRows.Add(row);
    }
}
