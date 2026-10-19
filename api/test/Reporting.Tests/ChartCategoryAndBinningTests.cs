using System.Globalization;
using Reporting.Abstractions;
using Reporting.DAL;
using Reporting.DAL.Repositories;
using Reporting.DAL.Widgets;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// The grouping charts' category handling (typed keys, date labels, date periods, Top N, drill-through),
/// histogram binning, point-chart sampling and aggregation, and the control chart modes and run rules —
/// all against a real (SQLite) provider so every GROUP BY is proven to translate.
/// </summary>
public class ChartCategoryAndBinningTests() : SqliteDbTestBase(foreignKeys: false)
{
    private BarChartQueryService Bar() => new(Db, Bands(), new DatasetResolver(Db));
    private HistogramQueryService Histogram() => new(Db, Bands(), new DatasetResolver(Db));
    private ChartQueryService Points() => new(Db, Bands(), new DatasetResolver(Db));
    private XBarRChartQueryService Control() => new(Db, Bands(), new DatasetResolver(Db));
    private BoxPlotQueryService Box() => new(Db, Bands(), new DatasetResolver(Db));
    private ChartToleranceBands Bands() => new(new ToleranceResolver(Db));

    [Fact]
    public async Task Bar_labels_a_date_category_with_the_column_format_not_its_raw_text()
    {
        var (dataset, refs) = NewDataset(("Made", DatasetColumnType.DateTime), ("Qty", DatasetColumnType.Double));
        AddRow(dataset, "2026-01-14T00:00:00.0000000", "3");
        AddRow(dataset, "2026-01-15T00:00:00.0000000", "4");
        await Db.SaveChangesAsync();

        var result = await Bar().QueryForBarChartAsync(dataset.Id, new BarChartQueryDto
        {
            CategoryColumnId = refs[0], ValueColumnIds = [refs[1]], Aggregate = Aggregate.Sum
        });

        Assert.Equal(
            [CellFormatter.Date(new DateTime(2026, 1, 14), null), CellFormatter.Date(new DateTime(2026, 1, 15), null)],
            result!.Categories);
        Assert.DoesNotContain(result.Categories, c => c.Contains('T'));
    }

    [Fact]
    public async Task Bar_groups_numbers_and_dates_by_value_and_trims_text()
    {
        var (numbers, numberRefs) = NewDataset(("Size", DatasetColumnType.Double), ("Qty", DatasetColumnType.Double));
        AddRow(numbers, "5", "1");
        AddRow(numbers, "5.0", "2");
        AddRow(numbers, "5.00", "3");
        AddRow(numbers, "10", "4");
        var (texts, textRefs) = NewDataset(("Region", DatasetColumnType.String), ("Qty", DatasetColumnType.Double));
        AddRow(texts, "North", "1");
        AddRow(texts, "North ", "2");
        await Db.SaveChangesAsync();

        var byNumber = await Bar().QueryForBarChartAsync(numbers.Id, new BarChartQueryDto
        {
            CategoryColumnId = numberRefs[0], ValueColumnIds = [numberRefs[1]], Aggregate = Aggregate.Sum
        });
        var byText = await Bar().QueryForBarChartAsync(texts.Id, new BarChartQueryDto
        {
            CategoryColumnId = textRefs[0], ValueColumnIds = [textRefs[1]], Aggregate = Aggregate.Sum
        });

        Assert.Equal(2, byNumber!.Categories.Count);
        Assert.Equal([6d, 4d], byNumber.Series.Single().Values);
        Assert.Equal(["North"], byText!.Categories);
        Assert.Equal([3d], byText.Series.Single().Values);
    }

    [Fact]
    public async Task Bar_buckets_dates_by_month_and_averages_across_the_whole_period()
    {
        var (dataset, refs) = NewDataset(("Made", DatasetColumnType.DateTime), ("Qty", DatasetColumnType.Double));
        AddRow(dataset, "2026-01-02", "2");
        AddRow(dataset, "2026-01-20", "4");
        AddRow(dataset, "2026-01-20", "6");
        AddRow(dataset, "2026-02-03", "10");
        await Db.SaveChangesAsync();

        var result = await Bar().QueryForBarChartAsync(dataset.Id, new BarChartQueryDto
        {
            CategoryColumnId = refs[0], ValueColumnIds = [refs[1]], Aggregate = Aggregate.Average,
            CategoryGrouping = DateGrouping.Month
        });

        Assert.Equal(["Jan 2026", "Feb 2026"], result!.Categories);
        Assert.Equal([4d, 10d], result.Series.Single().Values);
        Assert.Equal([3, 1], result.Series.Single().RowCounts);

        var drill = Assert.IsType<FilterConditionDto>(Assert.Single(result.CategoryDetails[0].Drill!.Children));
        Assert.Equal(FilterOperator.Between, drill.Operator);
        Assert.Equal(["2026-01-01", "2026-01-31"], drill.Values);
    }

    [Fact]
    public async Task Bar_top_n_keeps_the_leaders_and_rolls_the_rest_into_other()
    {
        var (dataset, refs) = NewDataset(("Region", DatasetColumnType.String), ("Qty", DatasetColumnType.Double));
        AddRow(dataset, "A", "50");
        AddRow(dataset, "B", "40");
        AddRow(dataset, "C", "5");
        AddRow(dataset, "D", "7");
        await Db.SaveChangesAsync();

        var result = await Bar().QueryForBarChartAsync(dataset.Id, new BarChartQueryDto
        {
            CategoryColumnId = refs[0], ValueColumnIds = [refs[1]], Aggregate = Aggregate.Sum,
            Sort = new ChartSort { By = ChartSortBy.Column, ColumnId = refs[1], Aggregate = SortAggregate.Sum, Descending = true, Limit = 2, ShowOther = true }
        });

        Assert.Equal(["A", "B", "Other"], result!.Categories);
        Assert.Equal([50d, 40d, 12d], result.Series.Single().Values);
        Assert.True(result.CategoryDetails[2].IsOther);
        Assert.Null(result.CategoryDetails[2].Drill);
        Assert.Equal("A", result.CategoryDetails[0].SortText);
    }

    [Fact]
    public async Task Bar_reduces_tooltip_columns_per_bar_and_resolves_them_by_name_on_another_dataset()
    {
        var (dataset, refs) = NewDataset(("Region", DatasetColumnType.String), ("Qty", DatasetColumnType.Double), ("Cost", DatasetColumnType.Double));
        AddRow(dataset, "A", "1", "10");
        AddRow(dataset, "A", "2", "15");
        await Db.SaveChangesAsync();

        var result = await Bar().QueryForBarChartAsync(dataset.Id, new BarChartQueryDto
        {
            CategoryColumnId = refs[0], ValueColumnIds = [refs[1]], Aggregate = Aggregate.Sum,
            TooltipColumns = [new ChartTooltipColumn { ColumnId = Guid.NewGuid(), ColumnName = "cost", Prefix = "Cost: " }]
        });

        Assert.Equal([["Cost: 25"]], result!.Series.Single().TooltipLines);
    }

    [Fact]
    public async Task Bar_drill_conditions_select_a_month_category_and_a_split_series()
    {
        var (dataset, refs) = NewDataset(
            ("Made", DatasetColumnType.DateTime), ("Line", DatasetColumnType.String), ("Qty", DatasetColumnType.Double));
        AddRow(dataset, "2026-02-03T00:00:00.0000000", "L1", "1");
        AddRow(dataset, "2026-02-20T00:00:00.0000000", "L2", "2");
        await Db.SaveChangesAsync();

        var result = await Bar().QueryForBarChartAsync(dataset.Id, new BarChartQueryDto
        {
            CategoryColumnId = refs[0], SeriesColumnId = refs[1], ValueColumnIds = [refs[2]],
            Aggregate = Aggregate.Sum, CategoryGrouping = DateGrouping.Month
        });

        // The month drills as the whole of February, inclusive of its last day.
        var month = Assert.IsType<FilterConditionDto>(Assert.Single(result!.CategoryDetails.Single().Drill!.Children));
        Assert.Equal(FilterOperator.Between, month.Operator);
        Assert.Equal(["2026-02-01", "2026-02-28"], month.Values);

        var line = Assert.IsType<FilterConditionDto>(Assert.Single(result.Series.Single(s => s.Label == "L2").Drill!.Children));
        Assert.Equal(FilterOperator.Equals, line.Operator);
        Assert.Equal(["L2"], line.Values);
    }

    [Fact]
    public async Task Series_labels_format_a_date_split_column()
    {
        var (dataset, refs) = NewDataset(("Region", DatasetColumnType.String), ("Qty", DatasetColumnType.Double), ("Made", DatasetColumnType.DateTime));
        AddRow(dataset, "A", "1", "2026-03-04T00:00:00.0000000");
        await Db.SaveChangesAsync();

        var result = await Bar().QueryForBarChartAsync(dataset.Id, new BarChartQueryDto
        {
            CategoryColumnId = refs[0], ValueColumnIds = [refs[1]], Aggregate = Aggregate.Sum, SeriesColumnId = refs[2]
        });

        Assert.Equal(CellFormatter.Date(new DateTime(2026, 3, 4), null), result!.Series.Single().Label);
    }

    [Fact]
    public async Task Histogram_with_a_fixed_range_leaves_outside_values_out_instead_of_piling_them_in_the_end_bins()
    {
        var (dataset, refs) = NewDataset(("Width", DatasetColumnType.Double));
        foreach (var value in new[] { -50, 0.5, 1.5, 2.5, 3.5, 100, 200 })
        {
            AddRow(dataset, value.ToString(CultureInfo.InvariantCulture));
        }
        await Db.SaveChangesAsync();

        var result = await Histogram().QueryForHistogramAsync(dataset.Id, new HistogramQueryDto
        {
            ValueColumnIds = [refs[0]], BinMode = HistogramBinMode.Count, BinCount = 2, RangeMin = 0, RangeMax = 4
        });

        Assert.Equal(3, result!.ExcludedCount);
        Assert.Equal([2d, 2d], result.Series.Single().Values);
        Assert.Equal(4, result.Series.Single().Count);
        Assert.Equal(2, result.Series.Single().Mean, 6);
    }

    [Fact]
    public async Task Histogram_width_mode_uses_the_exact_width_on_round_edges()
    {
        var (dataset, refs) = NewDataset(("Width", DatasetColumnType.Double));
        foreach (var value in new[] { 0.37, 6.2, 12.9, 23.1 })
        {
            AddRow(dataset, value.ToString(CultureInfo.InvariantCulture));
        }
        await Db.SaveChangesAsync();

        var result = await Histogram().QueryForHistogramAsync(dataset.Id, new HistogramQueryDto
        {
            ValueColumnIds = [refs[0]], BinMode = HistogramBinMode.Width, BinWidth = 5
        });

        Assert.Equal([0d, 5d, 10d, 15d, 20d], result!.Bins.Select(b => b.Lower));
        Assert.All(result.Bins, bin => Assert.Equal(5d, bin.Upper - bin.Lower, 9));
        Assert.Equal([1d, 1d, 1d, 0d, 1d], result.Series.Single().Values);
    }

    [Fact]
    public async Task Line_chart_aggregates_rows_by_month()
    {
        var (dataset, refs) = NewDataset(("Made", DatasetColumnType.DateTime), ("Qty", DatasetColumnType.Double));
        AddRow(dataset, "2026-01-02", "2");
        AddRow(dataset, "2026-01-20", "3");
        AddRow(dataset, "2026-02-03", "10");
        await Db.SaveChangesAsync();

        var result = await Points().QueryForChartAsync(dataset.Id, new ChartQueryDto
        {
            XColumnId = refs[0], YColumnId = refs[1], Aggregate = Aggregate.Sum, XGrouping = DateGrouping.Month
        });

        var points = result!.Series.Single().Points;
        Assert.Equal([5d, 10d], points.Select(p => (double)p.Y));
        Assert.Equal((new DateTime(2026, 1, 1) - DateTime.UnixEpoch).TotalMilliseconds, (double)points[0].X);
        Assert.Equal(["2 rows"], points[0].TooltipLines);
    }

    [Fact]
    public async Task Capped_point_charts_sample_evenly_across_x_so_the_latest_rows_stay()
    {
        var (dataset, refs) = NewDataset(("Seq", DatasetColumnType.Double), ("Value", DatasetColumnType.Double));
        // Stored newest-first, so "the first rows stored" would be the oldest X values... reversed here
        // to prove the sample spans the whole X range whichever way rows were stored.
        for (var i = 25_000; i >= 1; i--)
        {
            AddRow(dataset, i.ToString(CultureInfo.InvariantCulture), "1");
        }
        await Db.SaveChangesAsync();

        var result = await Points().QueryForChartAsync(dataset.Id, new ChartQueryDto { XColumnId = refs[0], YColumnId = refs[1] });

        var xs = result!.Series.Single().Points.Select(p => (double)p.X).ToList();
        Assert.True(result.Truncated);
        Assert.True(result.Sampled);
        Assert.Equal(25_000, result.TotalPoints);
        Assert.Equal(1d, xs.Min());
        Assert.Equal(25_000d, xs.Max());
        Assert.InRange(xs.Count, 19_000, 20_000);
    }

    [Fact]
    public async Task Individuals_chart_plots_every_row_with_moving_ranges()
    {
        var (dataset, refs) = NewDataset(("Seq", DatasetColumnType.Double), ("Value", DatasetColumnType.Double));
        var values = new[] { 10d, 12, 11, 13 };
        for (var i = 0; i < values.Length; i++)
        {
            AddRow(dataset, (i + 1).ToString(CultureInfo.InvariantCulture), values[i].ToString(CultureInfo.InvariantCulture));
        }
        await Db.SaveChangesAsync();

        var result = await Control().QueryForXBarRChartAsync(dataset.Id, new XBarRChartQueryDto
        {
            CategoryColumnId = refs[0], ValueColumnId = refs[1], Mode = ControlChartMode.Individuals
        });

        Assert.Equal(4, result!.Subgroups.Count);
        Assert.False(result.Subgroups[0].HasRange);
        Assert.Equal([2d, 1d, 2d], result.Subgroups.Skip(1).Select(s => s.Range));
        Assert.Equal(5d / 3, result.RCenterLine, 9);
        Assert.Equal(11.5 + 2.66 * 5d / 3, result.Subgroups[0].XBarUcl, 9);
    }

    [Fact]
    public async Task Xbar_s_uses_subgroup_standard_deviations()
    {
        var (dataset, refs) = NewDataset(("Batch", DatasetColumnType.String), ("Value", DatasetColumnType.Double));
        foreach (var (batch, value) in new[] { ("A", 1d), ("A", 3), ("B", 2), ("B", 6) })
        {
            AddRow(dataset, batch, value.ToString(CultureInfo.InvariantCulture));
        }
        await Db.SaveChangesAsync();

        var result = await Control().QueryForXBarRChartAsync(dataset.Id, new XBarRChartQueryDto
        {
            CategoryColumnId = refs[0], ValueColumnId = refs[1], Mode = ControlChartMode.XBarS
        });

        Assert.Equal(Math.Sqrt(2), result!.Subgroups[0].Range, 9);
        Assert.Equal(Math.Sqrt(8), result.Subgroups[1].Range, 9);
        Assert.Equal((Math.Sqrt(2) + Math.Sqrt(8)) / 2, result.RCenterLine, 9);
    }

    [Fact]
    public async Task Baseline_limits_hold_and_run_rules_flag_a_shift()
    {
        var (dataset, refs) = NewDataset(("Seq", DatasetColumnType.Double), ("Value", DatasetColumnType.Double));
        // A stable baseline of ten alternating-ish points, then nine points in a row above the centre.
        var values = new[] { 10d, 11, 9, 10.5, 9.5, 10, 11, 9, 10.5, 9.5, 10.6, 10.7, 10.8, 10.6, 10.7, 10.8, 10.6, 10.7, 10.8 };
        for (var i = 0; i < values.Length; i++)
        {
            AddRow(dataset, (i + 1).ToString(CultureInfo.InvariantCulture), values[i].ToString(CultureInfo.InvariantCulture));
        }
        await Db.SaveChangesAsync();

        var result = await Control().QueryForXBarRChartAsync(dataset.Id, new XBarRChartQueryDto
        {
            CategoryColumnId = refs[0], ValueColumnId = refs[1], Mode = ControlChartMode.Individuals,
            BaselineSubgroups = 10, RunRules = true
        });

        Assert.Equal(10, result!.BaselineCount);
        Assert.Equal(10d, result.XBarCenterLine, 9);
        Assert.All(result.Subgroups.Skip(10), s => Assert.Contains(2, s.MeanRules));
        Assert.All(result.Subgroups.Take(10), s => Assert.DoesNotContain(2, s.MeanRules));
        Assert.True(result.Subgroups[^1].MeanOutOfControl);
    }

    [Fact]
    public async Task Box_whiskers_never_invert_when_the_fences_exclude_every_value()
    {
        var (dataset, refs) = NewDataset(("Group", DatasetColumnType.String), ("Value", DatasetColumnType.Double));
        foreach (var value in new[] { 0d, 0, 10, 10 })
        {
            AddRow(dataset, "A", value.ToString(CultureInfo.InvariantCulture));
        }
        await Db.SaveChangesAsync();

        var result = await Box().QueryForBoxPlotAsync(dataset.Id, new BoxPlotQueryDto
        {
            CategoryColumnId = refs[0], ValueColumnId = refs[1], Whisker = BoxWhisker.StdDev, WhiskerFactor = 0.5
        });

        var box = result!.Series.Single().Boxes.Single()!;
        Assert.True(box.Min <= box.Q1);
        Assert.True(box.Max >= box.Q3);
        Assert.True(box.Min <= box.Max);
    }

    [Fact]
    public void New_chart_options_round_trip_through_the_stored_config()
    {
        var widget = new Widget();
        new WidgetDto
        {
            Id = Guid.NewGuid(),
            Type = WidgetType.LineChart,
            Config = new LineChartWidgetConfig
            {
                Aggregate = Aggregate.Average,
                XGrouping = DateGrouping.Week,
                XAxisInterval = 5,
                XAxisRotate = "vertical",
                YAxes = [new ChartValueAxis { Id = "primary", Interval = 2, Rotate = "horizontal", Scale = true }]
            }
        }.ApplyTo(widget);

        var config = Assert.IsType<LineChartWidgetConfig>(widget.ToDto().Config);
        Assert.Equal(Aggregate.Average, config.Aggregate);
        Assert.Equal(DateGrouping.Week, config.XGrouping);
        Assert.Equal(5, config.XAxisInterval);
        Assert.Equal("vertical", config.XAxisRotate);
        Assert.Equal(2, config.YAxes[0].Interval);
        Assert.True(config.YAxes[0].Scale);
    }

    private (Dataset Dataset, List<Guid> Refs) NewDataset(params (string Name, DatasetColumnType Type)[] columns)
    {
        var dataset = new Dataset { Name = "D", DatasetSourceId = 1, ReportRevisionId = 1 };
        var refs = new List<Guid>();
        var order = 0;
        foreach (var (name, type) in columns)
        {
            var refId = Guid.NewGuid();
            refs.Add(refId);
            dataset.Columns.Add(new DatasetColumn { RefId = refId, Name = name, Type = type, Order = order++ });
        }
        Db.Datasets.Add(dataset);
        Db.SaveChanges();
        return (dataset, refs);
    }

    /// <summary>A row whose cells take the raw texts in column order, typed the way an import would type them.</summary>
    private void AddRow(Dataset dataset, params string[] raw)
    {
        var row = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = dataset.Id };
        for (var i = 0; i < raw.Length; i++)
        {
            var column = dataset.Columns[i];
            row.Cells.Add(CellValues.Create(column.Id, raw[i], column.Type));
        }
        Db.DatasetRows.Add(row);
    }
}
