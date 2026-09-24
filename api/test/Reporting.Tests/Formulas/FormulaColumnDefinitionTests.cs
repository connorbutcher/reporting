using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.Tests.Formulas;

/// <summary>Adding a formula column, and what it computes for the rows it already has and for rows added or edited afterwards.</summary>
public class FormulaColumnDefinitionTests : FormulaColumnTestBase
{
    [Fact]
    public async Task A_formula_column_is_computed_for_every_existing_row()
    {
        await SeedAsync();

        var column = await AddFormulaAsync("Total", "[Qty] * [Price]");

        Assert.NotNull(column);
        Assert.Equal("[Qty] * [Price]", column.Formula);
        Assert.Equal(DatasetColumnType.Double, column.Type); // inferred from the formula
        Assert.Null(column.FormulaError);
        Assert.Equal(["21", "12", null], await ColumnValuesAsync("Total")); // a blank input gives a blank result
    }

    [Fact]
    public async Task The_type_can_be_chosen_and_an_int_column_rounds()
    {
        await SeedAsync();

        await AddFormulaAsync("Rounded", "[Qty] * [Price] / 4", DatasetColumnType.Int);

        Assert.Equal(["5", "3", null], await ColumnValuesAsync("Rounded")); // 5.25 -> 5, 3 -> 3
    }

    [Fact]
    public async Task Text_and_date_formulas_store_typed_cells()
    {
        await SeedAsync();

        await AddFormulaAsync("Label", "UPPER([Region]) & \"-\" & TEXT([Qty])");
        await AddFormulaAsync("Due", "DATEADD(\"day\", 30, [Ordered])");

        Assert.Equal(["NORTH-2", "SOUTH-3", "-"], await ColumnValuesAsync("Label"));
        Assert.Equal(["2026-03-31", "2026-04-14", null], await ColumnValuesAsync("Due"));

        var dueId = Db.DatasetColumns.Single(x => x.Name == "Due").Id;
        var due = await Db.DatasetCells.AsNoTracking()
            .Where(c => c.ColumnId == dueId && c.StringValue == "2026-03-31")
            .SingleAsync();

        // A real typed cell, so date filters and charts work on it.
        Assert.Equal(new DateTime(2026, 3, 31), due.DateValue);
    }

    [Fact]
    public async Task Formula_columns_can_read_other_formula_columns_in_dependency_order()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");
        await AddFormulaAsync("With Tax", "ROUND([Total] * 1.2, 1)");

        Assert.Equal(["25.2", "14.4", null], await ColumnValuesAsync("With Tax"));

        // Editing the earlier column recomputes the one that reads it.
        await UpdateFormulaAsync(await ColumnAsync("Total"), "Total", "[Qty] * [Price] + 1");

        Assert.Equal(["26.4", "15.6", null], await ColumnValuesAsync("With Tax"));
    }

    [Fact]
    public async Task Adding_and_editing_rows_recomputes_their_formula_cells()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");
        var totalId = await ColumnAsync("Total");
        var qtyId = await ColumnAsync("Qty");

        var added = await AddRowAsync("10", "2", "East", "2026-04-01");
        Assert.Equal("20", added.Values[totalId]);

        var first = (await Fresh().Rows.GetRowWindowAsync(DatasetId, 0, 10))!.Rows[0];
        var edited = new Dictionary<Guid, string>(first.Values.Where(kv => kv.Key != totalId))
        {
            [qtyId] = "5"
        };
        await Fresh().Rows.UpdateRowAsync(DatasetId, first.Id, edited);

        Assert.Equal(["52.5", "12", null, "20"], await ColumnValuesAsync("Total"));
    }

    [Fact]
    public async Task Clearing_an_input_blanks_the_result()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");
        var qtyId = await ColumnAsync("Qty");

        var first = (await Fresh().Rows.GetRowWindowAsync(DatasetId, 0, 1))!.Rows[0];
        var withoutQty = first.Values.Where(kv => kv.Key != qtyId).ToDictionary(kv => kv.Key, kv => kv.Value);
        await Fresh().Rows.UpdateRowAsync(DatasetId, first.Id, withoutQty);

        Assert.Equal([null, "12", null], await ColumnValuesAsync("Total"));
    }

    [Fact]
    public async Task A_value_submitted_for_a_computed_column_is_ignored()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");
        var totalId = await ColumnAsync("Total");

        var first = (await Fresh().Rows.GetRowWindowAsync(DatasetId, 0, 1))!.Rows[0];
        var submitted = new Dictionary<Guid, string>(first.Values) { [totalId] = "999" };
        await Fresh().Rows.UpdateRowAsync(DatasetId, first.Id, submitted);

        Assert.Equal("21", (await ColumnValuesAsync("Total"))[0]);
    }

    [Fact]
    public async Task A_client_that_omits_the_computed_column_does_not_drop_its_cell()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");
        var totalId = await ColumnAsync("Total");

        var first = (await Fresh().Rows.GetRowWindowAsync(DatasetId, 0, 1))!.Rows[0];
        var without = first.Values.Where(kv => kv.Key != totalId).ToDictionary(kv => kv.Key, kv => kv.Value);
        await Fresh().Rows.UpdateRowAsync(DatasetId, first.Id, without);

        Assert.Equal("21", (await ColumnValuesAsync("Total"))[0]);
    }

    [Fact]
    public async Task A_dataset_larger_than_one_batch_is_fully_computed()
    {
        await SeedAsync();
        await AddRowsAsync(1200);

        await AddFormulaAsync("Total", "[Qty] * [Price]");

        var totalId = await Db.DatasetColumns.Where(c => c.Name == "Total").Select(c => c.Id).SingleAsync();
        var totals = await Db.DatasetCells.Where(c => c.ColumnId == totalId).Select(c => c.StringValue).ToListAsync();

        Assert.Equal(1202, totals.Count); // every row with a Qty (the seeded blank-Qty row stays blank)
        Assert.Equal(1200, totals.Count(v => v == "6"));
    }

    private async Task AddRowsAsync(int count)
    {
        var dataset = await Db.Datasets.Include(d => d.Columns).SingleAsync(d => d.Id == DatasetId);
        var qtyId = dataset.Columns.Single(c => c.Name == "Qty").Id;
        var priceId = dataset.Columns.Single(c => c.Name == "Price").Id;

        for (var i = 0; i < count; i++)
        {
            var row = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = DatasetId };
            row.Cells.Add(CellValues.Create(qtyId, "2", DatasetColumnType.Int));
            row.Cells.Add(CellValues.Create(priceId, "3", DatasetColumnType.Double));
            Db.DatasetRows.Add(row);
        }

        await Db.SaveChangesAsync();
    }
}
