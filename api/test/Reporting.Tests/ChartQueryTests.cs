using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Repositories;
using Reporting.DAL.Widgets;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// Exercises <see cref="ChartQueryService.QueryForChartAsync"/> against a real (SQLite)
/// relational provider, so the LINQ it builds is proven to translate to SQL — in particular
/// the filtered <c>Include(r =&gt; r.Cells.Where(...))</c> layered over <c>OrderBy().Take()</c>,
/// and the date-axis branch that emits epoch-millisecond values.
/// </summary>
public class ChartQueryTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly ReportingDbContext _db;

    public ChartQueryTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        // Only the dataset/column/row/cell graph is seeded, so drop FK enforcement
        // rather than standing up the whole report/revision parent chain.
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

    private ChartQueryService Repo() => new(_db, new ChartToleranceBands(new ToleranceResolver(_db)), new DatasetResolver(_db));

    [Fact]
    public async Task QueryForChart_numeric_axes_returns_points_and_only_needed_tooltip_cell()
    {
        var xRef = Guid.NewGuid();
        var yRef = Guid.NewGuid();
        var noteRef = Guid.NewGuid();
        var ignoredRef = Guid.NewGuid();

        var dataset = new Dataset
        {
            Name = "D",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns =
            {
                new DatasetColumn { RefId = xRef, Name = "X", Type = DatasetColumnType.Double, Order = 0 },
                new DatasetColumn { RefId = yRef, Name = "Y", Type = DatasetColumnType.Double, Order = 1 },
                new DatasetColumn { RefId = noteRef, Name = "Note", Type = DatasetColumnType.String, Order = 2 },
                new DatasetColumn { RefId = ignoredRef, Name = "Ignored", Type = DatasetColumnType.String, Order = 3 },
            },
        };
        _db.Datasets.Add(dataset);
        await _db.SaveChangesAsync();

        var xId = dataset.Columns[0].Id;
        var yId = dataset.Columns[1].Id;
        var noteId = dataset.Columns[2].Id;
        var ignoredId = dataset.Columns[3].Id;

        AddRow(dataset.Id, (xId, 1d), (yId, 10d), noteId, "first", ignoredId, "skip");
        AddRow(dataset.Id, (xId, 2d), (yId, 20d), noteId, "second", ignoredId, "skip");
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForChartAsync(dataset.Id, new ChartQueryDto
        {
            XColumnId = xRef,
            YColumnId = yRef,
            TooltipColumns = [new ChartTooltipColumn { ColumnId = noteRef }],
        });

        Assert.NotNull(result);
        var series = Assert.Single(result!.Series);
        Assert.Equal(2, series.Points.Count);
        Assert.Equal(2, result.TotalPoints);
        Assert.False(result.Truncated);
        // Sorted by X, tooltip carries the requested Note column (proving the filtered include loaded it).
        Assert.Equal("first", Assert.Single(series.Points[0].TooltipLines));
        Assert.Equal("second", Assert.Single(series.Points[1].TooltipLines));
    }

    [Fact]
    public async Task QueryForChart_date_axis_emits_epoch_milliseconds()
    {
        var xRef = Guid.NewGuid();
        var yRef = Guid.NewGuid();

        var dataset = new Dataset
        {
            Name = "D",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns =
            {
                new DatasetColumn { RefId = xRef, Name = "When", Type = DatasetColumnType.DateTime, Order = 0 },
                new DatasetColumn { RefId = yRef, Name = "Y", Type = DatasetColumnType.Double, Order = 1 },
            },
        };
        _db.Datasets.Add(dataset);
        await _db.SaveChangesAsync();

        var xId = dataset.Columns[0].Id;
        var yId = dataset.Columns[1].Id;

        var when = new DateTime(2026, 8, 30, 0, 0, 0, DateTimeKind.Utc);
        var row = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = dataset.Id };
        row.Cells.Add(new DatasetCell { ColumnId = xId, DateValue = when, StringValue = when.ToString("O") });
        row.Cells.Add(new DatasetCell { ColumnId = yId, NumberValue = 5d, StringValue = "5" });
        _db.DatasetRows.Add(row);
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForChartAsync(dataset.Id, new ChartQueryDto
        {
            XColumnId = xRef,
            YColumnId = yRef,
        });

        var point = Assert.Single(Assert.Single(result!.Series).Points);
        var expectedMillis = (when - DateTime.UnixEpoch).TotalMilliseconds;
        Assert.Equal(expectedMillis, Convert.ToDouble(point.X));
    }

    [Fact]
    public async Task QueryForChart_column_sort_orders_points_by_a_column_not_plotted()
    {
        var xRef = Guid.NewGuid();
        var yRef = Guid.NewGuid();
        var sequenceRef = Guid.NewGuid();

        var dataset = new Dataset
        {
            Name = "D",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns =
            {
                new DatasetColumn { RefId = xRef, Name = "X", Type = DatasetColumnType.Double, Order = 0 },
                new DatasetColumn { RefId = yRef, Name = "Y", Type = DatasetColumnType.Double, Order = 1 },
                new DatasetColumn { RefId = sequenceRef, Name = "Sequence", Type = DatasetColumnType.Double, Order = 2 },
            },
        };
        _db.Datasets.Add(dataset);
        await _db.SaveChangesAsync();

        var xId = dataset.Columns[0].Id;
        var yId = dataset.Columns[1].Id;
        var sequenceId = dataset.Columns[2].Id;

        // X-ascending (the default) would draw 1, 2, 3; the sequence column reverses that order,
        // so the result only matches if the draw order really came from it, not from X.
        void AddPoint(double x, double y, double sequence)
        {
            var row = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = dataset.Id };
            row.Cells.Add(new DatasetCell { ColumnId = xId, NumberValue = x, StringValue = x.ToString() });
            row.Cells.Add(new DatasetCell { ColumnId = yId, NumberValue = y, StringValue = y.ToString() });
            row.Cells.Add(new DatasetCell { ColumnId = sequenceId, NumberValue = sequence, StringValue = sequence.ToString() });
            _db.DatasetRows.Add(row);
        }
        AddPoint(1, 10, 3);
        AddPoint(2, 20, 2);
        AddPoint(3, 30, 1);
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForChartAsync(dataset.Id, new ChartQueryDto
        {
            XColumnId = xRef,
            YColumnId = yRef,
            Sort = new ChartSort { By = ChartSortBy.Column, ColumnId = sequenceRef },
        });

        var points = Assert.Single(result!.Series).Points;
        Assert.Equal([3d, 2d, 1d], points.Select(p => Convert.ToDouble(p.X)));
    }

    [Fact]
    public async Task QueryForChart_trend_line_fits_a_perfect_line_exactly()
    {
        var xRef = Guid.NewGuid();
        var yRef = Guid.NewGuid();

        var dataset = new Dataset
        {
            Name = "D",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns =
            {
                new DatasetColumn { RefId = xRef, Name = "X", Type = DatasetColumnType.Double, Order = 0 },
                new DatasetColumn { RefId = yRef, Name = "Y", Type = DatasetColumnType.Double, Order = 1 },
            },
        };
        _db.Datasets.Add(dataset);
        await _db.SaveChangesAsync();

        var xId = dataset.Columns[0].Id;
        var yId = dataset.Columns[1].Id;

        // y = 2x + 1, exactly — the fit should recover that precisely, with a perfect R².
        void AddPoint(double x, double y)
        {
            var row = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = dataset.Id };
            row.Cells.Add(new DatasetCell { ColumnId = xId, NumberValue = x, StringValue = x.ToString() });
            row.Cells.Add(new DatasetCell { ColumnId = yId, NumberValue = y, StringValue = y.ToString() });
            _db.DatasetRows.Add(row);
        }
        AddPoint(0, 1);
        AddPoint(1, 3);
        AddPoint(2, 5);
        AddPoint(3, 7);
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForChartAsync(dataset.Id, new ChartQueryDto
        {
            XColumnId = xRef,
            YColumnId = yRef,
            ShowTrendLine = true,
        });

        var trend = Assert.Single(result!.Series).TrendLine;
        Assert.NotNull(trend);
        Assert.Equal(2d, trend!.Slope, precision: 9);
        Assert.Equal(1d, trend.Intercept, precision: 9);
        Assert.Equal(1d, trend.RSquared, precision: 9);
        Assert.Equal(0d, trend.X1);
        Assert.Equal(1d, trend.Y1, precision: 9);
        Assert.Equal(3d, trend.X2);
        Assert.Equal(7d, trend.Y2, precision: 9);
    }

    [Fact]
    public async Task QueryForChart_trend_line_is_omitted_for_a_text_axis_even_when_requested()
    {
        var xRef = Guid.NewGuid();
        var yRef = Guid.NewGuid();

        var dataset = new Dataset
        {
            Name = "D",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns =
            {
                new DatasetColumn { RefId = xRef, Name = "Category", Type = DatasetColumnType.String, Order = 0 },
                new DatasetColumn { RefId = yRef, Name = "Y", Type = DatasetColumnType.Double, Order = 1 },
            },
        };
        _db.Datasets.Add(dataset);
        await _db.SaveChangesAsync();

        var xId = dataset.Columns[0].Id;
        var yId = dataset.Columns[1].Id;

        void AddPoint(string x, double y)
        {
            var row = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = dataset.Id };
            row.Cells.Add(new DatasetCell { ColumnId = xId, StringValue = x });
            row.Cells.Add(new DatasetCell { ColumnId = yId, NumberValue = y, StringValue = y.ToString() });
            _db.DatasetRows.Add(row);
        }
        AddPoint("A", 1);
        AddPoint("B", 2);
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForChartAsync(dataset.Id, new ChartQueryDto
        {
            XColumnId = xRef,
            YColumnId = yRef,
            ShowTrendLine = true,
        });

        Assert.Null(Assert.Single(result!.Series).TrendLine);
    }

    [Fact]
    public async Task QueryForChart_size_column_populates_point_size_and_tolerates_a_missing_value()
    {
        var xRef = Guid.NewGuid();
        var yRef = Guid.NewGuid();
        var sizeRef = Guid.NewGuid();

        var dataset = new Dataset
        {
            Name = "D",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns =
            {
                new DatasetColumn { RefId = xRef, Name = "X", Type = DatasetColumnType.Double, Order = 0 },
                new DatasetColumn { RefId = yRef, Name = "Y", Type = DatasetColumnType.Double, Order = 1 },
                new DatasetColumn { RefId = sizeRef, Name = "Size", Type = DatasetColumnType.Double, Order = 2 },
            },
        };
        _db.Datasets.Add(dataset);
        await _db.SaveChangesAsync();

        var xId = dataset.Columns[0].Id;
        var yId = dataset.Columns[1].Id;
        var sizeId = dataset.Columns[2].Id;

        var sized = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = dataset.Id };
        sized.Cells.Add(new DatasetCell { ColumnId = xId, NumberValue = 1d, StringValue = "1" });
        sized.Cells.Add(new DatasetCell { ColumnId = yId, NumberValue = 10d, StringValue = "10" });
        sized.Cells.Add(new DatasetCell { ColumnId = sizeId, NumberValue = 42d, StringValue = "42" });
        _db.DatasetRows.Add(sized);

        // No cell at all for the size column — the point should still plot, just without a size.
        var unsized = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = dataset.Id };
        unsized.Cells.Add(new DatasetCell { ColumnId = xId, NumberValue = 2d, StringValue = "2" });
        unsized.Cells.Add(new DatasetCell { ColumnId = yId, NumberValue = 20d, StringValue = "20" });
        _db.DatasetRows.Add(unsized);
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForChartAsync(dataset.Id, new ChartQueryDto
        {
            XColumnId = xRef,
            YColumnId = yRef,
            SizeColumnId = sizeRef,
        });

        var points = Assert.Single(result!.Series).Points;
        Assert.Equal(42d, points.Single(p => (double)p.X == 1d).Size);
        Assert.Null(points.Single(p => (double)p.X == 2d).Size);
    }

    [Fact]
    public async Task QueryForChart_non_numeric_size_column_is_ignored()
    {
        var xRef = Guid.NewGuid();
        var yRef = Guid.NewGuid();
        var sizeRef = Guid.NewGuid();

        var dataset = new Dataset
        {
            Name = "D",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns =
            {
                new DatasetColumn { RefId = xRef, Name = "X", Type = DatasetColumnType.Double, Order = 0 },
                new DatasetColumn { RefId = yRef, Name = "Y", Type = DatasetColumnType.Double, Order = 1 },
                new DatasetColumn { RefId = sizeRef, Name = "Label", Type = DatasetColumnType.String, Order = 2 },
            },
        };
        _db.Datasets.Add(dataset);
        await _db.SaveChangesAsync();

        var xId = dataset.Columns[0].Id;
        var yId = dataset.Columns[1].Id;
        var sizeId = dataset.Columns[2].Id;

        var row = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = dataset.Id };
        row.Cells.Add(new DatasetCell { ColumnId = xId, NumberValue = 1d, StringValue = "1" });
        row.Cells.Add(new DatasetCell { ColumnId = yId, NumberValue = 10d, StringValue = "10" });
        row.Cells.Add(new DatasetCell { ColumnId = sizeId, StringValue = "whatever" });
        _db.DatasetRows.Add(row);
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForChartAsync(dataset.Id, new ChartQueryDto
        {
            XColumnId = xRef,
            YColumnId = yRef,
            SizeColumnId = sizeRef,
        });

        Assert.Null(Assert.Single(Assert.Single(result!.Series).Points).Size);
    }

    private void AddRow(int datasetId, (int col, double val) x, (int col, double val) y, int noteCol, string note, int ignoredCol, string ignored)
    {
        var row = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = datasetId };
        row.Cells.Add(new DatasetCell { ColumnId = x.col, NumberValue = x.val, StringValue = x.val.ToString() });
        row.Cells.Add(new DatasetCell { ColumnId = y.col, NumberValue = y.val, StringValue = y.val.ToString() });
        row.Cells.Add(new DatasetCell { ColumnId = noteCol, StringValue = note });
        row.Cells.Add(new DatasetCell { ColumnId = ignoredCol, StringValue = ignored });
        _db.DatasetRows.Add(row);
    }
}
