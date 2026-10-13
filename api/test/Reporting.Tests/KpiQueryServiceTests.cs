using Reporting.Abstractions;
using Reporting.DAL.Widgets;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// A KPI widget reduces a dataset to one headline number — either a plain aggregate over a column,
/// or the count/percent of rows failing a tolerance band — optionally compared against a fixed
/// target or the previous rolling period.
/// </summary>
public class KpiQueryServiceTests : SqliteDbTestBase
{
    public KpiQueryServiceTests() : base(foreignKeys: false) { }

    private KpiQueryService Service() => new(Db, new ToleranceResolver(Db));

    private static DatasetColumn Col(Guid refId, string name, DatasetColumnType type, int order) =>
        new() { RefId = refId, Name = name, Type = type, Order = order };

    private async Task<Dataset> SeedDatasetAsync(string name, params DatasetColumn[] columns)
    {
        var dataset = new Dataset { Name = name, DatasetSourceId = 1, ReportRevisionId = 1 };
        foreach (var column in columns) dataset.Columns.Add(column);
        Db.Datasets.Add(dataset);
        await Db.SaveChangesAsync();
        return dataset;
    }

    private void AddRow(Dataset dataset, params (DatasetColumn Column, double? Number, DateTime? Date)[] cells)
    {
        var row = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = dataset.Id };
        foreach (var (column, number, date) in cells)
            row.Cells.Add(new DatasetCell { ColumnId = column.Id, NumberValue = number, DateValue = date });
        Db.DatasetRows.Add(row);
    }

    [Fact]
    public async Task Aggregate_sum_reduces_the_value_column_and_ignores_blank_cells()
    {
        var valueRef = Guid.NewGuid();
        var dataset = await SeedDatasetAsync("Readings", Col(valueRef, "Value", DatasetColumnType.Double, 0));
        var value = dataset.Columns[0];
        AddRow(dataset, (value, 10, null));
        AddRow(dataset, (value, 20, null));
        AddRow(dataset, (value, null, null));
        await Db.SaveChangesAsync();

        var result = await Service().QueryForKpiAsync(dataset.Id, new KpiQueryDto
        {
            ValueSource = KpiValueSource.Aggregate,
            Aggregate = Aggregate.Sum,
            ValueColumnId = valueRef,
        });

        Assert.Equal(30, result!.Value);
        Assert.Equal(3, result.MatchedRowCount);
        Assert.Equal(3, result.TotalRowCount);
    }

    [Fact]
    public async Task Aggregate_average_and_count_reduce_correctly()
    {
        var valueRef = Guid.NewGuid();
        var dataset = await SeedDatasetAsync("Readings", Col(valueRef, "Value", DatasetColumnType.Double, 0));
        var value = dataset.Columns[0];
        AddRow(dataset, (value, 10, null));
        AddRow(dataset, (value, 30, null));
        await Db.SaveChangesAsync();

        var average = await Service().QueryForKpiAsync(dataset.Id, new KpiQueryDto
        {
            ValueSource = KpiValueSource.Aggregate,
            Aggregate = Aggregate.Average,
            ValueColumnId = valueRef,
        });
        Assert.Equal(20, average!.Value);

        var count = await Service().QueryForKpiAsync(dataset.Id, new KpiQueryDto
        {
            ValueSource = KpiValueSource.Aggregate,
            Aggregate = Aggregate.Count,
        });
        Assert.Equal(2, count!.Value);
    }

    [Fact]
    public async Task Tolerance_out_of_limits_counts_fail_rows_as_a_percent()
    {
        var valueRef = Guid.NewGuid();
        var minRef = Guid.NewGuid();
        var maxRef = Guid.NewGuid();

        var limits = await SeedDatasetAsync("Limits",
            Col(minRef, "Min", DatasetColumnType.Double, 0),
            Col(maxRef, "Max", DatasetColumnType.Double, 1));
        var limitsRow = Guid.NewGuid();
        var spec = new DatasetRow { RefId = limitsRow, DatasetId = limits.Id };
        spec.Cells.Add(new DatasetCell { ColumnId = limits.Columns[0].Id, NumberValue = 10 });
        spec.Cells.Add(new DatasetCell { ColumnId = limits.Columns[1].Id, NumberValue = 20 });
        Db.DatasetRows.Add(spec);
        await Db.SaveChangesAsync();

        var data = await SeedDatasetAsync("Readings", Col(valueRef, "Reading", DatasetColumnType.Double, 0));
        var reading = data.Columns[0];
        AddRow(data, (reading, 15, null)); // pass
        AddRow(data, (reading, 25, null)); // fail
        AddRow(data, (reading, 5, null));  // fail
        AddRow(data, (reading, 18, null)); // pass
        await Db.SaveChangesAsync();

        var tolerance = new ToleranceConfig
        {
            SourceDatasetId = limits.Id,
            SourceRowId = limitsRow,
            MinColumnId = minRef,
            MaxColumnId = maxRef,
        };

        var result = await Service().QueryForKpiAsync(data.Id, new KpiQueryDto
        {
            ValueSource = KpiValueSource.ToleranceOutOfLimits,
            ValueColumnId = valueRef,
            Tolerance = tolerance,
            ShowAsPercent = true,
        });

        Assert.Equal(50, result!.Value); // 2 of 4 rows fail
    }

    [Fact]
    public async Task Tolerance_status_mode_can_include_concession_rows()
    {
        var valueRef = Guid.NewGuid();
        var minRef = Guid.NewGuid();
        var maxRef = Guid.NewGuid();
        var lowerRef = Guid.NewGuid();
        var upperRef = Guid.NewGuid();

        var limits = await SeedDatasetAsync("Limits",
            Col(minRef, "Min", DatasetColumnType.Double, 0),
            Col(maxRef, "Max", DatasetColumnType.Double, 1),
            Col(lowerRef, "Lower", DatasetColumnType.Double, 2),
            Col(upperRef, "Upper", DatasetColumnType.Double, 3));
        var limitsRow = Guid.NewGuid();
        var spec = new DatasetRow { RefId = limitsRow, DatasetId = limits.Id };
        spec.Cells.Add(new DatasetCell { ColumnId = limits.Columns[0].Id, NumberValue = 10 });
        spec.Cells.Add(new DatasetCell { ColumnId = limits.Columns[1].Id, NumberValue = 20 });
        spec.Cells.Add(new DatasetCell { ColumnId = limits.Columns[2].Id, NumberValue = 8 });
        spec.Cells.Add(new DatasetCell { ColumnId = limits.Columns[3].Id, NumberValue = 22 });
        Db.DatasetRows.Add(spec);
        await Db.SaveChangesAsync();

        var data = await SeedDatasetAsync("Readings", Col(valueRef, "Reading", DatasetColumnType.Double, 0));
        var reading = data.Columns[0];
        AddRow(data, (reading, 15, null)); // pass
        AddRow(data, (reading, 9, null));  // concession (below 10, within 8 lower bound)
        AddRow(data, (reading, 5, null));  // fail
        await Db.SaveChangesAsync();

        var tolerance = new ToleranceConfig
        {
            SourceDatasetId = limits.Id,
            SourceRowId = limitsRow,
            MinColumnId = minRef,
            MaxColumnId = maxRef,
            ConcessionLowerColumnId = lowerRef,
            ConcessionUpperColumnId = upperRef,
        };

        var failOnly = await Service().QueryForKpiAsync(data.Id, new KpiQueryDto
        {
            ValueSource = KpiValueSource.ToleranceOutOfLimits,
            ValueColumnId = valueRef,
            Tolerance = tolerance,
            ShowAsPercent = false,
            ToleranceStatusMode = KpiToleranceStatusMode.Fail,
        });
        Assert.Equal(1, failOnly!.Value);

        var failOrConcession = await Service().QueryForKpiAsync(data.Id, new KpiQueryDto
        {
            ValueSource = KpiValueSource.ToleranceOutOfLimits,
            ValueColumnId = valueRef,
            Tolerance = tolerance,
            ShowAsPercent = false,
            ToleranceStatusMode = KpiToleranceStatusMode.FailOrConcession,
        });
        Assert.Equal(2, failOrConcession!.Value);
    }

    [Theory]
    [InlineData(KpiDirection.HigherIsBetter, KpiTrendSentiment.Good)]
    [InlineData(KpiDirection.LowerIsBetter, KpiTrendSentiment.Bad)]
    public async Task Fixed_target_comparison_derives_sentiment_from_direction(KpiDirection direction, KpiTrendSentiment expected)
    {
        var valueRef = Guid.NewGuid();
        var dataset = await SeedDatasetAsync("Readings", Col(valueRef, "Value", DatasetColumnType.Double, 0));
        AddRow(dataset, (dataset.Columns[0], 120, null));
        await Db.SaveChangesAsync();

        var result = await Service().QueryForKpiAsync(dataset.Id, new KpiQueryDto
        {
            ValueSource = KpiValueSource.Aggregate,
            Aggregate = Aggregate.Sum,
            ValueColumnId = valueRef,
            ComparisonMode = KpiComparisonMode.FixedTarget,
            TargetValue = 100,
            Direction = direction,
        });

        Assert.Equal(120, result!.Value);
        Assert.Equal(100, result.ComparisonValue);
        Assert.Equal(20, result.Delta);
        Assert.Equal(KpiTrend.Up, result.Trend);
        Assert.Equal(expected, result.Sentiment);
    }

    [Fact]
    public async Task Previous_period_compares_two_non_overlapping_rolling_windows()
    {
        var valueRef = Guid.NewGuid();
        var dateRef = Guid.NewGuid();
        var dataset = await SeedDatasetAsync("Readings",
            Col(valueRef, "Value", DatasetColumnType.Double, 0),
            Col(dateRef, "Date", DatasetColumnType.DateTime, 1));
        var (value, date) = (dataset.Columns[0], dataset.Columns[1]);

        var today = DateTime.UtcNow.Date;
        AddRow(dataset, (value, 10, null), (date, null, today));                 // current period
        AddRow(dataset, (value, 20, null), (date, null, today.AddDays(-3)));      // current period
        AddRow(dataset, (value, 7, null), (date, null, today.AddDays(-7)));       // exact boundary -> current period (start-inclusive)
        AddRow(dataset, (value, 100, null), (date, null, today.AddDays(-8)));     // previous period
        AddRow(dataset, (value, 999, null), (date, null, today.AddDays(-20)));    // outside both windows
        await Db.SaveChangesAsync();

        var result = await Service().QueryForKpiAsync(dataset.Id, new KpiQueryDto
        {
            ValueSource = KpiValueSource.Aggregate,
            Aggregate = Aggregate.Sum,
            ValueColumnId = valueRef,
            ComparisonMode = KpiComparisonMode.PreviousPeriod,
            DateColumnId = dateRef,
            PeriodDays = 7,
        });

        Assert.Equal(37, result!.Value);           // 10 + 20 + 7
        Assert.Equal(100, result.ComparisonValue);
        Assert.Equal(3, result.MatchedRowCount);
        Assert.Equal(5, result.TotalRowCount);
    }

    [Fact]
    public async Task No_comparison_leaves_trend_unknown()
    {
        var valueRef = Guid.NewGuid();
        var dataset = await SeedDatasetAsync("Readings", Col(valueRef, "Value", DatasetColumnType.Double, 0));
        AddRow(dataset, (dataset.Columns[0], 5, null));
        await Db.SaveChangesAsync();

        var result = await Service().QueryForKpiAsync(dataset.Id, new KpiQueryDto
        {
            ValueSource = KpiValueSource.Aggregate,
            Aggregate = Aggregate.Sum,
            ValueColumnId = valueRef,
        });

        Assert.Equal(KpiTrend.Unknown, result!.Trend);
        Assert.Equal(KpiTrendSentiment.Neutral, result.Sentiment);
        Assert.Null(result.ComparisonValue);
    }

    [Fact]
    public async Task Unknown_dataset_returns_null()
    {
        Assert.Null(await Service().QueryForKpiAsync(999, new KpiQueryDto()));
    }
}
