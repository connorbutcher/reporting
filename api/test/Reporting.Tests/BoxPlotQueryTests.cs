using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Widgets;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// Exercises <see cref="WidgetQueryRepository.QueryForBoxPlotAsync"/> against a real (SQLite)
/// relational provider, so the projection it builds is proven to translate to SQL and the
/// in-memory five-number summary (with Tukey outliers and series splits) is proven correct.
/// </summary>
public class BoxPlotQueryTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly ReportingDbContext _db;

    public BoxPlotQueryTests()
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
    public async Task QueryForBoxPlot_minMax_returns_five_number_summary_per_category()
    {
        var categoryRef = Guid.NewGuid();
        var valueRef = Guid.NewGuid();

        var dataset = new Dataset
        {
            Name = "D",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns =
            {
                new DatasetColumn { RefId = categoryRef, Name = "Group", Type = DatasetColumnType.String, Order = 0 },
                new DatasetColumn { RefId = valueRef, Name = "Value", Type = DatasetColumnType.Double, Order = 1 },
            },
        };
        _db.Datasets.Add(dataset);
        await _db.SaveChangesAsync();

        var categoryId = dataset.Columns[0].Id;
        var valueId = dataset.Columns[1].Id;

        // Category "A": 1..9, whose type-7 quartiles are Q1=3, median=5, Q3=7.
        foreach (var v in new[] { 1d, 2, 3, 4, 5, 6, 7, 8, 9 })
            AddRow(dataset.Id, categoryId, "A", valueId, v);
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForBoxPlotAsync(dataset.Id, new BoxPlotQueryDto
        {
            CategoryColumnId = categoryRef,
            ValueColumnId = valueRef,
            Whisker = BoxWhisker.MinMax,
        });

        Assert.NotNull(result);
        Assert.Equal(["A"], result!.Categories);
        var series = Assert.Single(result.Series);
        Assert.Equal("", series.Label); // no series column → one unlabelled series
        var box = Assert.Single(series.Boxes);
        Assert.NotNull(box);
        Assert.Equal(1d, box!.Min);
        Assert.Equal(3d, box.Q1);
        Assert.Equal(5d, box.Median);
        Assert.Equal(7d, box.Q3);
        Assert.Equal(9d, box.Max);
        Assert.Equal(9, box.Count);
        Assert.Empty(series.Outliers); // min/max whiskers never flag outliers
    }

    [Fact]
    public async Task QueryForBoxPlot_tukey_pulls_whiskers_in_and_reports_outliers()
    {
        var categoryRef = Guid.NewGuid();
        var valueRef = Guid.NewGuid();

        var dataset = new Dataset
        {
            Name = "D",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns =
            {
                new DatasetColumn { RefId = categoryRef, Name = "Group", Type = DatasetColumnType.String, Order = 0 },
                new DatasetColumn { RefId = valueRef, Name = "Value", Type = DatasetColumnType.Double, Order = 1 },
            },
        };
        _db.Datasets.Add(dataset);
        await _db.SaveChangesAsync();

        var categoryId = dataset.Columns[0].Id;
        var valueId = dataset.Columns[1].Id;

        // 1..5 sit inside the fences; 100 is well past the upper Tukey fence.
        foreach (var v in new[] { 1d, 2, 3, 4, 5, 100 })
            AddRow(dataset.Id, categoryId, "A", valueId, v);
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForBoxPlotAsync(dataset.Id, new BoxPlotQueryDto
        {
            CategoryColumnId = categoryRef,
            ValueColumnId = valueRef,
            Whisker = BoxWhisker.Tukey,
        });

        var series = Assert.Single(result!.Series);
        var box = Assert.Single(series.Boxes);
        Assert.Equal(1d, box!.Min); // lower whisker reaches the true minimum
        Assert.Equal(5d, box.Max); // upper whisker pulled in to the last in-fence value
        Assert.Equal(6, box.Count);
        var outlier = Assert.Single(series.Outliers);
        Assert.Equal(100d, outlier.Value);
        Assert.Equal(0, outlier.CategoryIndex);
    }

    [Fact]
    public async Task QueryForBoxPlot_splits_into_a_box_per_series_aligned_to_categories()
    {
        var categoryRef = Guid.NewGuid();
        var valueRef = Guid.NewGuid();
        var seriesRef = Guid.NewGuid();

        var dataset = new Dataset
        {
            Name = "D",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns =
            {
                new DatasetColumn { RefId = categoryRef, Name = "Group", Type = DatasetColumnType.String, Order = 0 },
                new DatasetColumn { RefId = valueRef, Name = "Value", Type = DatasetColumnType.Double, Order = 1 },
                new DatasetColumn { RefId = seriesRef, Name = "Line", Type = DatasetColumnType.String, Order = 2 },
            },
        };
        _db.Datasets.Add(dataset);
        await _db.SaveChangesAsync();

        var categoryId = dataset.Columns[0].Id;
        var valueId = dataset.Columns[1].Id;
        var seriesId = dataset.Columns[2].Id;

        // Series X has boxes in both categories; series Y only in "A".
        AddRow(dataset.Id, categoryId, "A", valueId, 1d, seriesId, "X");
        AddRow(dataset.Id, categoryId, "A", valueId, 3d, seriesId, "X");
        AddRow(dataset.Id, categoryId, "B", valueId, 5d, seriesId, "X");
        AddRow(dataset.Id, categoryId, "B", valueId, 7d, seriesId, "X");
        AddRow(dataset.Id, categoryId, "A", valueId, 2d, seriesId, "Y");
        AddRow(dataset.Id, categoryId, "A", valueId, 4d, seriesId, "Y");
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForBoxPlotAsync(dataset.Id, new BoxPlotQueryDto
        {
            CategoryColumnId = categoryRef,
            ValueColumnId = valueRef,
            SeriesColumnId = seriesRef,
            Whisker = BoxWhisker.MinMax,
        });

        Assert.Equal(["A", "B"], result!.Categories);
        Assert.Equal(2, result.Series.Count);

        var x = result.Series.Single(s => s.Label == "X");
        Assert.Equal(2, x.Boxes.Count);
        Assert.NotNull(x.Boxes[0]); // A
        Assert.NotNull(x.Boxes[1]); // B

        var y = result.Series.Single(s => s.Label == "Y");
        Assert.NotNull(y.Boxes[0]); // A
        Assert.Null(y.Boxes[1]); // no rows in B → a gap, keeping the box aligned to its category
    }

    [Fact]
    public async Task QueryForBoxPlot_reports_mean_and_standard_deviation()
    {
        var (dataset, categoryRef, valueRef) = NewStudy();
        var categoryId = dataset.Columns[0].Id;
        var valueId = dataset.Columns[1].Id;

        // mean = 4; sample sd = sqrt(((2-4)² + 0 + (6-4)²) / 2) = 2.
        foreach (var v in new[] { 2d, 4, 6 }) AddRow(dataset.Id, categoryId, "A", valueId, v);
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForBoxPlotAsync(dataset.Id, new BoxPlotQueryDto
        {
            CategoryColumnId = categoryRef,
            ValueColumnId = valueRef,
            Whisker = BoxWhisker.MinMax,
        });

        var box = Assert.Single(Assert.Single(result!.Series).Boxes);
        Assert.Equal(4d, box!.Mean);
        Assert.Equal(2d, box.StdDev, 10);
    }

    [Fact]
    public async Task QueryForBoxPlot_stdDev_whisker_flags_points_beyond_k_sigma()
    {
        var (dataset, categoryRef, valueRef) = NewStudy();
        var categoryId = dataset.Columns[0].Id;
        var valueId = dataset.Columns[1].Id;

        // mean 11, sd sqrt(10) ≈ 3.162; at 1.5σ the upper fence ≈ 15.74, so 20 is an outlier.
        foreach (var v in new[] { 10d, 10, 10, 10, 10, 10, 10, 10, 10, 20 })
            AddRow(dataset.Id, categoryId, "A", valueId, v);
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForBoxPlotAsync(dataset.Id, new BoxPlotQueryDto
        {
            CategoryColumnId = categoryRef,
            ValueColumnId = valueRef,
            Whisker = BoxWhisker.StdDev,
            WhiskerFactor = 1.5,
        });

        var series = Assert.Single(result!.Series);
        var box = Assert.Single(series.Boxes);
        Assert.Equal(10d, box!.Max); // upper whisker pulled back inside the fence
        var outlier = Assert.Single(series.Outliers);
        Assert.Equal(20d, outlier.Value);
    }

    [Fact]
    public async Task QueryForBoxPlot_whiskerFactor_widens_the_fences()
    {
        var (dataset, categoryRef, valueRef) = NewStudy();
        var categoryId = dataset.Columns[0].Id;
        var valueId = dataset.Columns[1].Id;

        // Q1=2.25, Q3=4.75, IQR=2.5. 9 is an outlier at 1.5×IQR (fence 8.5) but not at 3×IQR (fence 12.25).
        foreach (var v in new[] { 1d, 2, 3, 4, 5, 9 }) AddRow(dataset.Id, categoryId, "A", valueId, v);
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForBoxPlotAsync(dataset.Id, new BoxPlotQueryDto
        {
            CategoryColumnId = categoryRef,
            ValueColumnId = valueRef,
            Whisker = BoxWhisker.Tukey,
            WhiskerFactor = 3.0,
        });

        var series = Assert.Single(result!.Series);
        var box = Assert.Single(series.Boxes);
        Assert.Empty(series.Outliers); // widened fence no longer flags 9
        Assert.Equal(9d, box!.Max);
    }

    [Fact]
    public async Task QueryForBoxPlot_sort_by_median_reorders_categories()
    {
        var (dataset, categoryRef, valueRef) = NewStudy();
        var categoryId = dataset.Columns[0].Id;
        var valueId = dataset.Columns[1].Id;

        // Alphabetical order is A, B, C; by median it's B (1), C (5), A (10).
        AddRow(dataset.Id, categoryId, "A", valueId, 10d);
        AddRow(dataset.Id, categoryId, "A", valueId, 10d);
        AddRow(dataset.Id, categoryId, "B", valueId, 1d);
        AddRow(dataset.Id, categoryId, "B", valueId, 1d);
        AddRow(dataset.Id, categoryId, "C", valueId, 5d);
        AddRow(dataset.Id, categoryId, "C", valueId, 5d);
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForBoxPlotAsync(dataset.Id, new BoxPlotQueryDto
        {
            CategoryColumnId = categoryRef,
            ValueColumnId = valueRef,
            Whisker = BoxWhisker.MinMax,
            Sort = BoxSort.MedianAsc,
        });

        Assert.Equal(["B", "C", "A"], result!.Categories);
    }

    [Fact]
    public async Task QueryForBoxPlot_includePoints_returns_the_raw_values()
    {
        var (dataset, categoryRef, valueRef) = NewStudy();
        var categoryId = dataset.Columns[0].Id;
        var valueId = dataset.Columns[1].Id;

        foreach (var v in new[] { 5d, 1, 4, 2, 3 }) AddRow(dataset.Id, categoryId, "A", valueId, v);
        await _db.SaveChangesAsync();

        var withPoints = await Repo().QueryForBoxPlotAsync(dataset.Id, new BoxPlotQueryDto
        {
            CategoryColumnId = categoryRef,
            ValueColumnId = valueRef,
            Whisker = BoxWhisker.MinMax,
            IncludePoints = true,
        });
        var box = Assert.Single(Assert.Single(withPoints!.Series).Boxes);
        Assert.Equal([1d, 2, 3, 4, 5], box!.Points); // returned sorted, all five values

        // Off by default, so the payload stays lean.
        var without = await Repo().QueryForBoxPlotAsync(dataset.Id, new BoxPlotQueryDto
        {
            CategoryColumnId = categoryRef,
            ValueColumnId = valueRef,
            Whisker = BoxWhisker.MinMax,
        });
        Assert.Empty(Assert.Single(Assert.Single(without!.Series).Boxes)!.Points);
    }

    private (Dataset dataset, Guid categoryRef, Guid valueRef) NewStudy()
    {
        var categoryRef = Guid.NewGuid();
        var valueRef = Guid.NewGuid();
        var dataset = new Dataset
        {
            Name = "D",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns =
            {
                new DatasetColumn { RefId = categoryRef, Name = "Group", Type = DatasetColumnType.String, Order = 0 },
                new DatasetColumn { RefId = valueRef, Name = "Value", Type = DatasetColumnType.Double, Order = 1 },
            },
        };
        _db.Datasets.Add(dataset);
        _db.SaveChanges();
        return (dataset, categoryRef, valueRef);
    }

    private void AddRow(int datasetId, int categoryCol, string category, int valueCol, double value)
    {
        var row = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = datasetId };
        row.Cells.Add(new DatasetCell { ColumnId = categoryCol, StringValue = category });
        row.Cells.Add(new DatasetCell { ColumnId = valueCol, NumberValue = value, StringValue = value.ToString() });
        _db.DatasetRows.Add(row);
    }

    private void AddRow(int datasetId, int categoryCol, string category, int valueCol, double value, int seriesCol, string series)
    {
        var row = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = datasetId };
        row.Cells.Add(new DatasetCell { ColumnId = categoryCol, StringValue = category });
        row.Cells.Add(new DatasetCell { ColumnId = valueCol, NumberValue = value, StringValue = value.ToString() });
        row.Cells.Add(new DatasetCell { ColumnId = seriesCol, StringValue = series });
        _db.DatasetRows.Add(row);
    }
}
