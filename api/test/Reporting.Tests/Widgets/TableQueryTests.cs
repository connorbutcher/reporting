using Reporting.Abstractions;
using Reporting.DAL.Repositories;
using Reporting.DAL.Widgets;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// Exercises <see cref="TableQueryService"/> against SQLite: stable paging, typed cell values,
/// the totals row and data-bar ranges over every matched row, the search box, the single-row
/// lookup, and the full export.
/// </summary>
public class TableQueryTests : SqliteDbTestBase
{
    public TableQueryTests() : base(foreignKeys: false)
    {
    }

    private TableQueryService Repo()
    {
        return new(Db, new ToleranceResolver(Db), new DatasetResolver(Db));
    }

    private readonly Guid _nameRef = Guid.NewGuid();
    private readonly Guid _costRef = Guid.NewGuid();
    private readonly Guid _dateRef = Guid.NewGuid();

    private Dataset Seed(params (string Name, double? Cost)[] rows)
    {
        var dataset = new Dataset { Name = "Parts", DatasetSourceId = 1, ReportRevisionId = 1 };
        dataset.Columns.Add(new DatasetColumn { RefId = _nameRef, Name = "Name", Type = DatasetColumnType.String, Order = 0 });
        dataset.Columns.Add(new DatasetColumn { RefId = _costRef, Name = "Cost", Type = DatasetColumnType.Double, Order = 1 });
        dataset.Columns.Add(new DatasetColumn { RefId = _dateRef, Name = "Made", Type = DatasetColumnType.DateTime, Order = 2 });
        Db.Datasets.Add(dataset);
        Db.SaveChanges();

        var name = dataset.Columns[0].Id;
        var cost = dataset.Columns[1].Id;
        var made = dataset.Columns[2].Id;
        var day = 0;
        foreach (var (text, value) in rows)
        {
            var row = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = dataset.Id };
            row.Cells.Add(new DatasetCell { ColumnId = name, StringValue = text });
            if (value is { } v)
            {
                row.Cells.Add(new DatasetCell { ColumnId = cost, NumberValue = v, StringValue = v.ToString(System.Globalization.CultureInfo.InvariantCulture) });
            }

            var date = new DateTime(2026, 1, 1).AddDays(day++);
            row.Cells.Add(new DatasetCell { ColumnId = made, DateValue = date, StringValue = date.ToString("o") });
            Db.DatasetRows.Add(row);
        }
        Db.SaveChanges();
        return dataset;
    }

    private List<DataTableColumnSetting> Columns(Aggregate? costTotal = null, bool dataBars = false)
    {
        return [
            new() { ColumnId = _nameRef, Total = Aggregate.Count },
            new() { ColumnId = _costRef, Total = costTotal, DataBars = dataBars },
            new() { ColumnId = _dateRef },
        ];
    }

    [Fact]
    public async Task Pages_cover_every_row_exactly_once_when_the_sort_column_ties()
    {
        // Every row has the same cost, so only the id tiebreak gives the pages a fixed order.
        var dataset = Seed(Enumerable.Range(0, 25).Select(i => ($"Part {i:00}", (double?)5)).ToArray());

        var seen = new List<string>();
        for (var skip = 0; skip < 25; skip += 10)
        {
            var page = await Repo().QueryForTableAsync(dataset.Id, new TableQueryDto
            {
                Columns = Columns(),
                SortColumnId = _costRef,
                Skip = skip,
                Take = 10,
            });
            seen.AddRange(page!.Rows.Select(r => r.Cells[_nameRef].DisplayValue!));
        }

        Assert.Equal(25, seen.Count);
        Assert.Equal(25, seen.Distinct().Count());
    }

    [Fact]
    public async Task Unsorted_rows_come_back_in_insertion_order()
    {
        var dataset = Seed(("A", 1), ("B", 2), ("C", 3));

        var result = await Repo().QueryForTableAsync(dataset.Id, new TableQueryDto { Columns = Columns(), Take = 10 });

        Assert.Equal(["A", "B", "C"], result!.Rows.Select(r => r.Cells[_nameRef].DisplayValue));
    }

    [Fact]
    public async Task Cells_carry_their_typed_value_alongside_the_display_text()
    {
        var dataset = Seed(("Bolt", 12.5), ("Nut", null));

        var result = await Repo().QueryForTableAsync(dataset.Id, new TableQueryDto { Columns = Columns(), Take = 10 });

        var bolt = result!.Rows[0].Cells;
        Assert.Equal("Bolt", bolt[_nameRef].Value);
        Assert.Equal(12.5, bolt[_costRef].Value);
        Assert.Equal(new DateTime(2026, 1, 1), bolt[_dateRef].Value);
        Assert.Null(result.Rows[1].Cells[_costRef].Value);
    }

    [Theory]
    [InlineData(Aggregate.Sum, 60d)]
    [InlineData(Aggregate.Average, 20d)]
    [InlineData(Aggregate.Min, 10d)]
    [InlineData(Aggregate.Max, 30d)]
    public async Task Totals_reduce_every_matched_row_not_just_the_page(Aggregate aggregate, double expected)
    {
        var dataset = Seed(("A", 10), ("B", 20), ("C", 30), ("D", null));

        var result = await Repo().QueryForTableAsync(dataset.Id, new TableQueryDto
        {
            Columns = Columns(aggregate),
            Take = 1,
        });

        Assert.Single(result!.Rows);
        Assert.Equal(expected, result.Totals[_costRef].Value);
        // Count tallies rows with a value in the column, on any column type.
        Assert.Equal(4d, result.Totals[_nameRef].Value);
        Assert.False(result.Totals.ContainsKey(_dateRef));
    }

    [Fact]
    public async Task Totals_follow_the_filter()
    {
        var dataset = Seed(("A", 10), ("B", 20), ("C", 30));

        var result = await Repo().QueryForTableAsync(dataset.Id, new TableQueryDto
        {
            Columns = Columns(Aggregate.Sum),
            Filter = new FilterGroupDto
            {
                Children = [new FilterConditionDto { ColumnId = _costRef, Operator = FilterOperator.GreaterThan, Values = ["15"] }],
            },
        });

        Assert.Equal(50d, result!.Totals[_costRef].Value);
        Assert.Equal("50", result.Totals[_costRef].DisplayValue);
    }

    [Fact]
    public async Task Data_bar_columns_report_their_range_over_every_matched_row()
    {
        var dataset = Seed(("A", 10), ("B", -4), ("C", 30));

        var result = await Repo().QueryForTableAsync(dataset.Id, new TableQueryDto
        {
            Columns = Columns(dataBars: true),
            Take = 1,
        });

        var stats = Assert.Single(result!.ColumnStats);
        Assert.Equal(_costRef, stats.Key);
        Assert.Equal(-4d, stats.Value.Min);
        Assert.Equal(30d, stats.Value.Max);
    }

    [Fact]
    public async Task Search_matches_text_in_any_requested_column_ignoring_case()
    {
        var dataset = Seed(("Hex bolt", 10), ("Washer", 20), ("Nut", 315));

        var byName = await Repo().QueryForTableAsync(dataset.Id, new TableQueryDto { Columns = Columns(), Search = "BOLT" });
        Assert.Equal(["Hex bolt"], byName!.Rows.Select(r => r.Cells[_nameRef].DisplayValue));
        Assert.Equal(1, byName.MatchedRowCount);
        Assert.Equal(3, byName.TotalRowCount);

        // Numbers are searched through their stored text.
        var byCost = await Repo().QueryForTableAsync(dataset.Id, new TableQueryDto { Columns = Columns(), Search = "31" });
        Assert.Equal(["Nut"], byCost!.Rows.Select(r => r.Cells[_nameRef].DisplayValue));
    }

    [Fact]
    public async Task Search_treats_wildcards_as_plain_text()
    {
        var dataset = Seed(("50% off", 1), ("Fifty", 2));

        var result = await Repo().QueryForTableAsync(dataset.Id, new TableQueryDto { Columns = Columns(), Search = "0%" });

        Assert.Equal(["50% off"], result!.Rows.Select(r => r.Cells[_nameRef].DisplayValue));
    }

    [Fact]
    public async Task A_row_id_narrows_the_query_to_that_row()
    {
        var dataset = Seed(("A", 1), ("B", 2));
        var target = Db.DatasetRows.Where(r => r.DatasetId == dataset.Id).OrderBy(r => r.Id).Skip(1).First().RefId;

        var result = await Repo().QueryForTableAsync(dataset.Id, new TableQueryDto { Columns = Columns(), RowId = target });

        var row = Assert.Single(result!.Rows);
        Assert.Equal(target, row.Id);
    }

    [Fact]
    public async Task Export_returns_every_matched_row_past_the_page_cap()
    {
        var dataset = Seed(Enumerable.Range(0, TableQueryService.MaxPageRows + 20).Select(i => ($"P{i}", (double?)i)).ToArray());

        var page = await Repo().QueryForTableAsync(dataset.Id, new TableQueryDto { Columns = Columns(), Take = 100_000 });
        var export = await Repo().QueryForTableExportAsync(dataset.Id, new TableQueryDto { Columns = Columns(), Skip = 40, Take = 10 });

        Assert.Equal(TableQueryService.MaxPageRows, page!.Rows.Count);
        Assert.Equal(TableQueryService.MaxPageRows + 20, export!.Rows.Count);
    }
}
