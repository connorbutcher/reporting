using System.Globalization;
using Reporting.Abstractions;
using Reporting.DAL;
using Reporting.DAL.Repositories;
using Reporting.DAL.Widgets;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// Exercises <see cref="PivotQueryService"/> against SQLite: grouping and sorting rows, column fields,
/// subtotals, the distinct/median aggregates, "show as" percentages, date grouping, and drill-through
/// filters that select exactly the rows behind each pivot row.
/// </summary>
public class PivotQueryTests : SqliteDbTestBase
{
    public PivotQueryTests() : base(foreignKeys: false)
    {
    }

    private readonly Guid _region = Guid.NewGuid();
    private readonly Guid _product = Guid.NewGuid();
    private readonly Guid _sales = Guid.NewGuid();
    private readonly Guid _made = Guid.NewGuid();

    private PivotQueryService Repo() => new(Db, new DatasetResolver(Db));
    private TableQueryService Table() => new(Db, new ToleranceResolver(Db), new DatasetResolver(Db));

    private Dataset Seed(params (string Region, string Product, double? Sales, string Made)[] rows)
    {
        var dataset = new Dataset { Name = "Sales", DatasetSourceId = 1, ReportRevisionId = 1 };
        dataset.Columns.Add(new DatasetColumn { RefId = _region, Name = "Region", Type = DatasetColumnType.String, Order = 0 });
        dataset.Columns.Add(new DatasetColumn { RefId = _product, Name = "Product", Type = DatasetColumnType.String, Order = 1 });
        dataset.Columns.Add(new DatasetColumn { RefId = _sales, Name = "Sales", Type = DatasetColumnType.Double, Order = 2 });
        dataset.Columns.Add(new DatasetColumn { RefId = _made, Name = "Made", Type = DatasetColumnType.DateTime, Order = 3 });
        Db.Datasets.Add(dataset);
        Db.SaveChanges();

        var ids = dataset.Columns.Select(c => c.Id).ToArray();
        foreach (var (region, product, sales, made) in rows)
        {
            var row = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = dataset.Id };
            row.Cells.Add(new DatasetCell { ColumnId = ids[0], StringValue = region });
            row.Cells.Add(new DatasetCell { ColumnId = ids[1], StringValue = product });
            if (sales is { } s)
                row.Cells.Add(new DatasetCell { ColumnId = ids[2], NumberValue = s, StringValue = s.ToString(CultureInfo.InvariantCulture) });
            var date = DateTime.Parse(made, CultureInfo.InvariantCulture);
            row.Cells.Add(new DatasetCell { ColumnId = ids[3], DateValue = date, StringValue = date.ToString("o") });
            Db.DatasetRows.Add(row);
        }
        Db.SaveChanges();
        return dataset;
    }

    private Dataset SeedStandard() => Seed(
        ("North", "Bolt", 10, "2026-01-05"),
        ("North", "Nut", 20, "2026-01-20"),
        ("North", "Bolt", 30, "2026-02-03"),
        ("South", "Nut", 5, "2026-02-14"),
        ("South", "Washer", 15, "2026-04-01"),
        ("East", "Bolt", 7, "2026-04-30"));


    private PivotMeasureDto SumOfSales(PivotShowAs showAs = PivotShowAs.Value) =>
        new() { ColumnId = _sales, Aggregate = PivotAggregate.Sum, ShowAs = showAs };

    private static PivotMeasureDto Count => new() { Aggregate = PivotAggregate.Count };

    private static List<double?> Values(PivotRowDto row) => row.Values.Select(v => v.Value).ToList();

    [Fact]
    public async Task Groups_rows_by_field_in_natural_order_with_a_grand_total()
    {
        var dataset = SeedStandard();

        var result = await Repo().QueryForPivotAsync(dataset.Id, new PivotQueryDto
        {
            RowFields = [_region],
            Measures = [SumOfSales(), Count],
        });

        Assert.Equal(["East", "North", "South"], result!.Rows.Select(r => r.Dimensions[0]));
        Assert.Equal([7d, 1d], Values(result.Rows[0]));
        Assert.Equal([60d, 3d], Values(result.Rows[1]));
        Assert.Equal([87d, 6d], Values(result.GrandTotal!));
        Assert.Equal(["Sum of Sales", "Count"], result.Measures.Select(m => m.Label));
        Assert.False(result.Truncated);
        Assert.Equal(6, result.ScannedRowCount);
    }

    [Fact]
    public async Task Sorts_by_a_measure_highest_first()
    {
        var dataset = SeedStandard();

        var result = await Repo().QueryForPivotAsync(dataset.Id, new PivotQueryDto
        {
            RowFields = [_region],
            Measures = [SumOfSales()],
            SortMeasureIndex = 0,
            SortDescending = true,
        });

        Assert.Equal(["North", "South", "East"], result!.Rows.Select(r => r.Dimensions[0]));
    }

    [Fact]
    public async Task Sorts_by_an_inner_dimension_descending()
    {
        var dataset = SeedStandard();

        var result = await Repo().QueryForPivotAsync(dataset.Id, new PivotQueryDto
        {
            RowFields = [_region, _product],
            Measures = [Count],
            SortRowFieldIndex = 1,
            SortDescending = true,
        });

        Assert.Equal(
            ["South/Washer", "North/Nut", "South/Nut", "East/Bolt", "North/Bolt"],
            result!.Rows.Select(r => string.Join('/', r.Dimensions)));
    }

    [Fact]
    public async Task Column_fields_spread_each_measure_across_the_top_with_row_totals()
    {
        var dataset = SeedStandard();

        var result = await Repo().QueryForPivotAsync(dataset.Id, new PivotQueryDto
        {
            RowFields = [_region],
            ColumnFields = [_product],
            Measures = [SumOfSales()],
        });

        Assert.Equal(["Bolt", "Nut", "Washer"], result!.ColumnKeys.Select(k => k.Labels[0]));
        Assert.True(result.HasRowTotals);
        var north = result.Rows.Single(r => r.Dimensions[0] == "North");
        // Bolt, Nut, Washer, then the row total.
        Assert.Equal([40d, 20d, null, 60d], Values(north));
        Assert.Equal([47d, 25d, 15d, 87d], Values(result.GrandTotal!));
    }

    [Fact]
    public async Task Column_fields_without_a_grand_total_drop_the_row_totals()
    {
        var dataset = SeedStandard();

        var result = await Repo().QueryForPivotAsync(dataset.Id, new PivotQueryDto
        {
            RowFields = [_region],
            ColumnFields = [_product],
            Measures = [SumOfSales()],
            ShowGrandTotal = false,
        });

        Assert.False(result!.HasRowTotals);
        Assert.Null(result.GrandTotal);
        Assert.Equal([40d, 20d, null], Values(result.Rows.Single(r => r.Dimensions[0] == "North")));
    }

    [Fact]
    public async Task Subtotals_head_each_outer_group()
    {
        var dataset = SeedStandard();

        var result = await Repo().QueryForPivotAsync(dataset.Id, new PivotQueryDto
        {
            RowFields = [_region, _product],
            Measures = [SumOfSales()],
            ShowSubtotals = true,
        });

        Assert.Equal(
            ["East/", "East/Bolt", "North/", "North/Bolt", "North/Nut", "South/", "South/Nut", "South/Washer"],
            result!.Rows.Select(r => string.Join('/', r.Dimensions)));
        var north = result.Rows.Single(r => r.IsSubtotal && r.Dimensions[0] == "North");
        Assert.Equal(1, north.Depth);
        Assert.Equal([60d], Values(north));
        Assert.All(result.Rows.Where(r => !r.IsSubtotal), r => Assert.Equal(2, r.Depth));
    }

    [Fact]
    public async Task A_measure_sort_with_subtotals_orders_groups_then_their_children()
    {
        var dataset = SeedStandard();

        var result = await Repo().QueryForPivotAsync(dataset.Id, new PivotQueryDto
        {
            RowFields = [_region, _product],
            Measures = [SumOfSales()],
            ShowSubtotals = true,
            SortMeasureIndex = 0,
            SortDescending = true,
        });

        Assert.Equal(
            ["North/", "North/Bolt", "North/Nut", "South/", "South/Washer", "South/Nut", "East/", "East/Bolt"],
            result!.Rows.Select(r => string.Join('/', r.Dimensions)));
    }

    [Fact]
    public async Task Counts_distinct_values_and_takes_medians()
    {
        var dataset = SeedStandard();

        var result = await Repo().QueryForPivotAsync(dataset.Id, new PivotQueryDto
        {
            RowFields = [_region],
            Measures =
            [
                new PivotMeasureDto { ColumnId = _product, Aggregate = PivotAggregate.CountDistinct },
                new PivotMeasureDto { ColumnId = _sales, Aggregate = PivotAggregate.Median },
            ],
        });

        var north = result!.Rows.Single(r => r.Dimensions[0] == "North");
        Assert.Equal([2d, 20d], Values(north));
        var south = result.Rows.Single(r => r.Dimensions[0] == "South");
        Assert.Equal([2d, 10d], Values(south));
        Assert.Equal([3d, 12.5d], Values(result.GrandTotal!));
        Assert.Equal(["Distinct Product", "Median of Sales"], result.Measures.Select(m => m.Label));
    }

    [Fact]
    public async Task Shows_values_as_a_share_of_the_total_or_of_the_parent_group()
    {
        var dataset = SeedStandard();

        var result = await Repo().QueryForPivotAsync(dataset.Id, new PivotQueryDto
        {
            RowFields = [_region, _product],
            Measures = [SumOfSales(PivotShowAs.PercentOfTotal), SumOfSales(PivotShowAs.PercentOfParent)],
            ShowSubtotals = true,
        });

        var northBolt = result!.Rows.Single(r => !r.IsSubtotal && r.Dimensions[0] == "North" && r.Dimensions[1] == "Bolt");
        Assert.Equal(40d / 87, northBolt.Values[0].Value!.Value, 6);
        Assert.Equal(40d / 60, northBolt.Values[1].Value!.Value, 6);
        Assert.Equal("66.7%", northBolt.Values[1].DisplayValue);
        var north = result.Rows.Single(r => r.IsSubtotal && r.Dimensions[0] == "North");
        Assert.Equal(60d / 87, north.Values[1].Value!.Value, 6);
        Assert.Equal([1d, 1d], Values(result.GrandTotal!));
    }

    [Fact]
    public async Task Groups_a_date_field_by_month_in_date_order()
    {
        var dataset = SeedStandard();

        var result = await Repo().QueryForPivotAsync(dataset.Id, new PivotQueryDto
        {
            RowFields = [_made],
            FieldGroupings = [new PivotFieldGroupingDto { ColumnId = _made, Grouping = DateGrouping.Month }],
            Measures = [SumOfSales()],
        });

        Assert.Equal(["Jan 2026", "Feb 2026", "Apr 2026"], result!.Rows.Select(r => r.Dimensions[0]));
        Assert.Equal([30d, 35d, 22d], result.Rows.Select(r => r.Values[0].Value));
        Assert.Equal("Made (month)", result.RowFields[0].Label);

        var april = Assert.IsType<FilterConditionDto>(Assert.Single(result.Rows[2].Drill!.Children));
        Assert.Equal(FilterOperator.Between, april.Operator);
        Assert.Equal(["2026-04-01", "2026-04-30"], april.Values);
    }

    [Theory]
    [InlineData(DateGrouping.Day, "5 Jan 2026")]
    [InlineData(DateGrouping.Week, "2026-W02")]
    [InlineData(DateGrouping.Quarter, "2026 Q1")]
    [InlineData(DateGrouping.Year, "2026")]
    public void Labels_each_date_period(DateGrouping grouping, string expected)
    {
        var (start, end, display) = PivotField.Period(new DateTime(2026, 1, 5, 14, 30, 0), grouping);

        Assert.Equal(expected, display);
        Assert.True(start <= new DateTime(2026, 1, 5) && end > new DateTime(2026, 1, 5, 14, 30, 0));
    }

    [Fact]
    public async Task Drill_filters_select_exactly_the_rows_behind_each_row_and_column()
    {
        var dataset = Seed(
            ("North", "Bolt", 10.2, "2026-01-05T08:00:00"),
            ("North", "Bolt", 10.4, "2026-01-05T09:00:00"),
            ("North", "Nut", 11, "2026-01-06"),
            ("South", "", 12, "2026-01-06"),
            ("South", "Nut", 10.3, "2026-02-01"));

        var result = await Repo().QueryForPivotAsync(dataset.Id, new PivotQueryDto
        {
            RowFields = [_region, _product],
            ColumnFields = [_made],
            FieldGroupings = [new PivotFieldGroupingDto { ColumnId = _made, Grouping = DateGrouping.Month }],
            Measures = [Count],
            ShowSubtotals = true,
        });

        async Task<int> Matched(params FilterGroupDto[] parts)
        {
            var filter = new FilterGroupDto { Join = FilterJoin.And, Children = parts.Cast<FilterNodeDto>().ToList() };
            var table = await Table().QueryForTableAsync(dataset.Id, new TableQueryDto { Filter = filter, Columns = [new() { ColumnId = _region }] });
            return table!.MatchedRowCount;
        }

        Assert.Contains(result!.Rows, r => r.Dimensions[1] == "(blank)");
        foreach (var row in result.Rows)
        {
            Assert.NotNull(row.Drill);
            // The last value is the row total: the count of rows in the group.
            Assert.Equal((int)row.Values[^1].Value!, await Matched(row.Drill!));
            for (var k = 0; k < result.ColumnKeys.Count; k++)
            {
                Assert.Equal((int)(row.Values[k].Value ?? 0), await Matched(row.Drill!, result.ColumnKeys[k].Drill!));
            }
        }
    }

    [Fact]
    public async Task Drill_on_a_rounded_number_selects_the_whole_range_that_shares_its_label()
    {
        var dataset = Seed(
            ("A", "x", 10.2, "2026-01-01"),
            ("A", "x", 10.4, "2026-01-01"),
            ("A", "x", 11, "2026-01-01"));
        var sales = dataset.Columns.Single(c => c.RefId == _sales);
        sales.SetConfig(new NumericColumnConfig { Decimals = 0 });
        Db.SaveChanges();

        var result = await Repo().QueryForPivotAsync(dataset.Id, new PivotQueryDto { RowFields = [_sales], Measures = [Count] });

        var ten = result!.Rows.Single(r => r.Dimensions[0] == "10");
        Assert.Equal(2d, ten.Values[0].Value);
        var condition = Assert.IsType<FilterConditionDto>(Assert.Single(ten.Drill!.Children));
        Assert.Equal(FilterOperator.Between, condition.Operator);
        Assert.Equal(["10.2", "10.4"], condition.Values);
    }
}
