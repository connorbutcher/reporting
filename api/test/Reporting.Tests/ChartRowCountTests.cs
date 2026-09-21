using Reporting.Abstractions;
using Reporting.DAL.Widgets;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// Every chart result reports the dataset's total row count and how many rows the filter matched,
/// so its widget can show the table's "N of M rows" footer. Proven per chart kind against SQLite,
/// with and without a filter (the unfiltered case skips the second COUNT).
/// </summary>
public class ChartRowCountTests : SqliteDbTestBase
{
    private readonly Guid _regionRef = Guid.NewGuid();
    private readonly Guid _valueRef = Guid.NewGuid();

    public ChartRowCountTests() : base(foreignKeys: false) { }

    private WidgetQueryRepository Repo() => new(Db, new ToleranceResolver(Db));

    /// <summary>Five rows: three in "North", two in "South".</summary>
    private async Task<int> SeedAsync()
    {
        var dataset = new Dataset
        {
            Name = "D",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns =
            {
                new DatasetColumn { RefId = _regionRef, Name = "Region", Type = DatasetColumnType.String, Order = 0 },
                new DatasetColumn { RefId = _valueRef, Name = "Value", Type = DatasetColumnType.Double, Order = 1 },
            },
        };
        Db.Datasets.Add(dataset);
        await Db.SaveChangesAsync();

        var region = dataset.Columns[0].Id;
        var value = dataset.Columns[1].Id;
        foreach (var (name, number) in new[] { ("North", 1d), ("North", 2d), ("North", 3d), ("South", 4d), ("South", 5d) })
        {
            var row = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = dataset.Id };
            row.Cells.Add(new DatasetCell { ColumnId = region, StringValue = name });
            row.Cells.Add(new DatasetCell { ColumnId = value, NumberValue = number, StringValue = number.ToString() });
            Db.DatasetRows.Add(row);
        }
        await Db.SaveChangesAsync();
        return dataset.Id;
    }

    private FilterGroupDto RegionEquals(string region) => new()
    {
        Children = { new FilterConditionDto { ColumnId = _regionRef, Operator = FilterOperator.Equals, Values = [region] } },
    };

    [Fact]
    public async Task Point_chart_reports_total_and_matched_rows()
    {
        var id = await SeedAsync();
        var repo = Repo();
        var request = new ChartQueryDto { XColumnId = _valueRef, YColumnId = _valueRef };

        var unfiltered = await repo.QueryForChartAsync(id, request);
        Assert.Equal(5, unfiltered!.TotalRowCount);
        Assert.Equal(5, unfiltered.MatchedRowCount);

        request.Filter = RegionEquals("North");
        var filtered = await repo.QueryForChartAsync(id, request);
        Assert.Equal(5, filtered!.TotalRowCount);
        Assert.Equal(3, filtered.MatchedRowCount);
    }

    [Fact]
    public async Task Bar_chart_reports_total_and_matched_rows()
    {
        var id = await SeedAsync();
        var repo = Repo();
        var request = new BarChartQueryDto
        {
            CategoryColumnId = _regionRef,
            ValueColumnIds = [_valueRef],
            Aggregate = Aggregate.Sum,
        };

        var unfiltered = await repo.QueryForBarChartAsync(id, request);
        Assert.Equal(5, unfiltered!.TotalRowCount);
        Assert.Equal(5, unfiltered.MatchedRowCount);

        request.Filter = RegionEquals("North");
        var filtered = await repo.QueryForBarChartAsync(id, request);
        Assert.Equal(5, filtered!.TotalRowCount);
        Assert.Equal(3, filtered.MatchedRowCount);
    }

    [Fact]
    public async Task Box_plot_reports_total_and_matched_rows()
    {
        var id = await SeedAsync();
        var repo = Repo();
        var request = new BoxPlotQueryDto { CategoryColumnId = _regionRef, ValueColumnId = _valueRef };

        var unfiltered = await repo.QueryForBoxPlotAsync(id, request);
        Assert.Equal(5, unfiltered!.TotalRowCount);
        Assert.Equal(5, unfiltered.MatchedRowCount);

        request.Filter = RegionEquals("North");
        var filtered = await repo.QueryForBoxPlotAsync(id, request);
        Assert.Equal(5, filtered!.TotalRowCount);
        Assert.Equal(3, filtered.MatchedRowCount);
    }

    [Fact]
    public async Task Histogram_reports_total_and_matched_rows()
    {
        var id = await SeedAsync();
        var repo = Repo();
        var request = new HistogramQueryDto { ValueColumnId = _valueRef };

        var unfiltered = await repo.QueryForHistogramAsync(id, request);
        Assert.Equal(5, unfiltered!.TotalRowCount);
        Assert.Equal(5, unfiltered.MatchedRowCount);

        request.Filter = RegionEquals("North");
        var filtered = await repo.QueryForHistogramAsync(id, request);
        Assert.Equal(5, filtered!.TotalRowCount);
        Assert.Equal(3, filtered.MatchedRowCount);
    }

    [Fact]
    public async Task Histogram_with_no_binnable_rows_still_reports_the_counts()
    {
        var id = await SeedAsync();

        // A region that doesn't exist leaves nothing to bin, which returns the early "empty"
        // result — that path must carry the counts too, so the widget can say "0 of 5 rows".
        var result = await Repo().QueryForHistogramAsync(id, new HistogramQueryDto
        {
            ValueColumnId = _valueRef,
            Filter = RegionEquals("West"),
        });

        Assert.Empty(result!.Bins);
        Assert.Equal(5, result.TotalRowCount);
        Assert.Equal(0, result.MatchedRowCount);
    }

    [Fact]
    public async Task Box_plot_and_histogram_report_the_rows_they_scanned_and_are_not_truncated_under_the_cap()
    {
        var id = await SeedAsync();
        var repo = Repo();

        var box = await repo.QueryForBoxPlotAsync(id, new BoxPlotQueryDto { CategoryColumnId = _regionRef, ValueColumnId = _valueRef });
        var histogram = await repo.QueryForHistogramAsync(id, new HistogramQueryDto { ValueColumnId = _valueRef, Filter = RegionEquals("North") });

        Assert.False(box!.Truncated);
        Assert.Equal(5, box.ScannedRowCount);
        Assert.False(histogram!.Truncated);
        Assert.Equal(3, histogram.ScannedRowCount);
    }

    [Fact]
    public void TrimToScanCap_drops_the_probe_row_and_reports_truncation_only_when_the_cap_was_exceeded()
    {
        var overCap = new List<int> { 1, 2, 3 };
        Assert.True(WidgetQueryRepository.TrimToScanCap(overCap, 2));
        Assert.Equal([1, 2], overCap);

        // Exactly at the cap is a complete scan, not a truncated one.
        var atCap = new List<int> { 1, 2 };
        Assert.False(WidgetQueryRepository.TrimToScanCap(atCap, 2));
        Assert.Equal([1, 2], atCap);

        var underCap = new List<int> { 1 };
        Assert.False(WidgetQueryRepository.TrimToScanCap(underCap, 2));
        Assert.Equal([1], underCap);
    }
}
