using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Widgets;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// Exercises <see cref="WidgetQueryRepository.QueryForChartAsync"/> against a real (SQLite)
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

    private WidgetQueryRepository Repo() => new(_db, new ToleranceResolver(_db));

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
