using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Formulas;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>Formula columns end to end against a relational (SQLite) database: definition, calculation, and how they follow changes to the columns and rows they read.</summary>
public class FormulaColumnTests : SqliteDbTestBase
{
    private int _datasetId;

    public FormulaColumnTests() : base(foreignKeys: false) { }

    private sealed record Services(DatasetFormulaRepository Formulas, DatasetRepository Datasets, DatasetRowRepository Rows);

    /// <summary>Fresh services on a cleared change tracker — each call stands in for a new request.</summary>
    private Services Fresh()
    {
        Db.ChangeTracker.Clear();
        var calculator = new FormulaCalculationService(Db, new FormulaFunctionCatalogueLoader(Db));
        return new Services(new DatasetFormulaRepository(Db, calculator), new DatasetRepository(Db, calculator), new DatasetRowRepository(Db, calculator));
    }

    private async Task<DatasetSchemaDto> SchemaAsync() => (await Fresh().Datasets.GetSchemaAsync(_datasetId))!;

    private async Task<Guid> ColumnAsync(string name) => (await SchemaAsync()).Columns.Single(c => c.Name == name).Id;

    /// <summary>Every row's values keyed by column name, in insertion order.</summary>
    private async Task<List<Dictionary<string, string?>>> RowsAsync()
    {
        var schema = await SchemaAsync();
        var window = (await Fresh().Rows.GetRowWindowAsync(_datasetId, 0, 500))!;
        return window.Rows
            .Select(r => schema.Columns.ToDictionary(c => c.Name, c => r.Values.GetValueOrDefault(c.Id)))
            .ToList();
    }

    private async Task<List<string?>> ColumnValuesAsync(string name) => (await RowsAsync()).Select(r => r[name]).ToList();

    /// <summary>A dataset of Qty (int), Price (double), Region (text) and Ordered (date), with three rows — the last with a blank Qty.</summary>
    private async Task SeedAsync()
    {
        var dataset = new Dataset
        {
            Name = "Sales",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns =
            {
                new DatasetColumn { RefId = Guid.NewGuid(), Name = "Qty", Type = DatasetColumnType.Int, Order = 0 },
                new DatasetColumn { RefId = Guid.NewGuid(), Name = "Price", Type = DatasetColumnType.Double, Order = 1 },
                new DatasetColumn { RefId = Guid.NewGuid(), Name = "Region", Type = DatasetColumnType.String, Order = 2 },
                new DatasetColumn { RefId = Guid.NewGuid(), Name = "Ordered", Type = DatasetColumnType.DateTime, Order = 3 },
            },
        };
        Db.Datasets.Add(dataset);
        await Db.SaveChangesAsync();
        _datasetId = dataset.Id;

        await AddRowAsync("2", "10.5", "North", "2026-03-01");
        await AddRowAsync("3", "4", "South", "2026-03-15");
        await AddRowAsync(null, "7", null, null);
    }

    private async Task<DatasetRowDto> AddRowAsync(string? qty, string? price, string? region, string? ordered)
    {
        var values = new Dictionary<Guid, string>();
        void Put(string name, Guid id, string? v) { if (v is not null) values[id] = v; }
        var schema = await SchemaAsync();
        Guid Id(string name) => schema.Columns.Single(c => c.Name == name).Id;
        Put("Qty", Id("Qty"), qty);
        Put("Price", Id("Price"), price);
        Put("Region", Id("Region"), region);
        Put("Ordered", Id("Ordered"), ordered);
        return (await Fresh().Rows.AddRowAsync(_datasetId, values))!;
    }

    private Task<DatasetColumnDto?> AddFormulaAsync(string name, string expression, DatasetColumnType? type = null) =>
        Fresh().Formulas.AddAsync(_datasetId, new SaveFormulaColumnDto { Name = name, Expression = expression, Type = type });

    // --- defining and calculating ---

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

        var due = await Db.DatasetCells.AsNoTracking()
            .Where(c => c.ColumnId == Db.DatasetColumns.Single(x => x.Name == "Due").Id && c.StringValue == "2026-03-31")
            .SingleAsync();
        Assert.Equal(new DateTime(2026, 3, 31), due.DateValue); // a real typed cell, so date filters and charts work on it
    }

    [Fact]
    public async Task Formula_columns_can_read_other_formula_columns_in_dependency_order()
    {
        await SeedAsync();

        // Defined dependent-first would fail; defined in order, then the *earlier* one is edited so the order matters.
        await AddFormulaAsync("Total", "[Qty] * [Price]");
        await AddFormulaAsync("With Tax", "ROUND([Total] * 1.2, 1)");

        Assert.Equal(["25.2", "14.4", null], await ColumnValuesAsync("With Tax"));

        var total = await ColumnAsync("Total");
        await Fresh().Formulas.UpdateAsync(_datasetId, total, new SaveFormulaColumnDto { Name = "Total", Expression = "[Qty] * [Price] + 1" });

        Assert.Equal(["26.4", "15.6", null], await ColumnValuesAsync("With Tax"));
    }

    [Fact]
    public async Task Adding_and_editing_rows_recomputes_their_formula_cells()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");

        var added = await AddRowAsync("10", "2", "East", "2026-04-01");
        Assert.Equal("20", added.Values[await ColumnAsync("Total")]);

        var window = (await Fresh().Rows.GetRowWindowAsync(_datasetId, 0, 10))!;
        var first = window.Rows[0];
        var totalId = await ColumnAsync("Total");
        var edited = new Dictionary<Guid, string>(first.Values.Where(kv => kv.Key != totalId))
        {
            [await ColumnAsync("Qty")] = "5"
        };
        await Fresh().Rows.UpdateRowAsync(_datasetId, first.Id, edited);

        Assert.Equal(["52.5", "12", null, "20"], await ColumnValuesAsync("Total"));
    }

    [Fact]
    public async Task Clearing_an_input_blanks_the_result()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");

        var first = (await Fresh().Rows.GetRowWindowAsync(_datasetId, 0, 1))!.Rows[0];
        var qty = await ColumnAsync("Qty");
        await Fresh().Rows.UpdateRowAsync(_datasetId, first.Id, first.Values.Where(kv => kv.Key != qty).ToDictionary(kv => kv.Key, kv => kv.Value));

        Assert.Equal([null, "12", null], await ColumnValuesAsync("Total"));
    }

    [Fact]
    public async Task A_value_submitted_for_a_computed_column_is_ignored_and_the_computed_cell_survives_a_save()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");
        var total = await ColumnAsync("Total");

        var first = (await Fresh().Rows.GetRowWindowAsync(_datasetId, 0, 1))!.Rows[0];
        var submitted = new Dictionary<Guid, string>(first.Values) { [total] = "999" };
        await Fresh().Rows.UpdateRowAsync(_datasetId, first.Id, submitted);
        Assert.Equal("21", (await ColumnValuesAsync("Total"))[0]);

        // A client that only sends the columns it edited (omitting the computed one) must not drop its cell.
        var without = first.Values.Where(kv => kv.Key != total).ToDictionary(kv => kv.Key, kv => kv.Value);
        await Fresh().Rows.UpdateRowAsync(_datasetId, first.Id, without);
        Assert.Equal("21", (await ColumnValuesAsync("Total"))[0]);
    }

    // --- validation ---

    [Fact]
    public async Task An_invalid_formula_is_rejected_with_its_problems_and_nothing_is_saved()
    {
        await SeedAsync();

        var ex = await Assert.ThrowsAsync<DataValidationException>(() => AddFormulaAsync("Bad", "NOPE([Missing]) + ROUND()"));

        Assert.Contains("NOPE", ex.Message);
        Assert.Contains("[Missing]", ex.Message);
        Assert.DoesNotContain(Db.DatasetColumns, c => c.Name == "Bad");
    }

    [Fact]
    public async Task A_formula_whose_result_doesnt_fit_the_chosen_type_is_rejected()
    {
        await SeedAsync();

        var ex = await Assert.ThrowsAsync<DataValidationException>(() => AddFormulaAsync("Bad", "[Qty] > 1", DatasetColumnType.Double));
        Assert.Contains("doesn't fit", ex.Message);
    }

    [Fact]
    public async Task A_result_kind_that_cant_be_inferred_needs_an_explicit_type()
    {
        await SeedAsync();

        var ex = await Assert.ThrowsAsync<DataValidationException>(() => AddFormulaAsync("Mixed", "IF([Qty] > 2, \"big\", 0)"));
        Assert.Contains("choose the column's type", ex.Message);

        await AddFormulaAsync("Mixed", "IF([Qty] > 2, \"big\", 0)", DatasetColumnType.String);
        Assert.Equal(["0", "big", "0"], await ColumnValuesAsync("Mixed")); // a blank condition is false
    }

    [Fact]
    public async Task Names_must_be_unique_and_bracket_free()
    {
        await SeedAsync();

        await Assert.ThrowsAsync<DataValidationException>(() => AddFormulaAsync("qty", "1"));
        await Assert.ThrowsAsync<DataValidationException>(() => AddFormulaAsync("a]b", "1"));
        await Assert.ThrowsAsync<DataValidationException>(() => AddFormulaAsync("  ", "1"));
    }

    [Fact]
    public async Task Circular_references_are_rejected()
    {
        await SeedAsync();
        await AddFormulaAsync("A", "[Qty] + 1");
        await AddFormulaAsync("B", "[A] + 1");

        var a = await ColumnAsync("A");
        var ex = await Assert.ThrowsAsync<DataValidationException>(() =>
            Fresh().Formulas.UpdateAsync(_datasetId, a, new SaveFormulaColumnDto { Name = "A", Expression = "[B] + 1" }));
        Assert.Contains("circular", ex.Message);

        var self = await Assert.ThrowsAsync<DataValidationException>(() =>
            Fresh().Formulas.UpdateAsync(_datasetId, a, new SaveFormulaColumnDto { Name = "A", Expression = "[A] + 1" }));
        Assert.Contains("refers to itself", self.Message);

        // The failed edits changed nothing.
        Assert.Equal("[Qty] + 1", (await SchemaAsync()).Columns.Single(c => c.Name == "A").Formula);
        Assert.Equal(["3", "4", null], await ColumnValuesAsync("A"));
    }

    [Fact]
    public async Task Updating_a_plain_column_as_a_formula_is_refused()
    {
        await SeedAsync();

        var qty = await ColumnAsync("Qty");
        var ex = await Assert.ThrowsAsync<DataValidationException>(() =>
            Fresh().Formulas.UpdateAsync(_datasetId, qty, new SaveFormulaColumnDto { Name = "Qty", Expression = "1" }));
        Assert.Contains("isn't a formula column", ex.Message);
    }

    // --- following changes to the columns they read ---

    [Fact]
    public async Task Renaming_a_column_rewrites_the_formulas_that_read_it()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");
        var qty = await ColumnAsync("Qty");

        await Fresh().Datasets.UpdateColumnAsync(_datasetId, qty, "Units", DatasetColumnType.Int);

        var total = (await SchemaAsync()).Columns.Single(c => c.Name == "Total");
        Assert.Equal("[Units] * [Price]", total.Formula);
        Assert.Null(total.FormulaError);
        Assert.Equal(["21", "12", null], await ColumnValuesAsync("Total"));
    }

    [Fact]
    public async Task Renaming_a_formula_column_rewrites_the_formulas_that_read_it()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");
        await AddFormulaAsync("With Tax", "[Total] * 1.2");
        var total = await ColumnAsync("Total");

        await Fresh().Formulas.UpdateAsync(_datasetId, total, new SaveFormulaColumnDto { Name = "Net", Expression = "[Qty] * [Price]" });

        var schema = await SchemaAsync();
        Assert.Equal("[Net] * 1.2", schema.Columns.Single(c => c.Name == "With Tax").Formula);
        Assert.Null(schema.Columns.Single(c => c.Name == "With Tax").FormulaError);
    }

    [Fact]
    public async Task A_column_a_formula_reads_cant_be_deleted()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");

        var ex = await Assert.ThrowsAsync<DataConflictException>(async () =>
            await Fresh().Datasets.DeleteColumnAsync(_datasetId, await ColumnAsync("Qty")));
        Assert.Contains("[Total]", ex.Message);

        // Removing the formula first frees it.
        Assert.True(await Fresh().Datasets.DeleteColumnAsync(_datasetId, await ColumnAsync("Total")));
        Assert.True(await Fresh().Datasets.DeleteColumnAsync(_datasetId, await ColumnAsync("Qty")));
    }

    [Fact]
    public async Task Retyping_an_input_recomputes_dependents_and_flags_those_that_no_longer_fit()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");
        await AddFormulaAsync("Shout", "UPPER([Region])");
        var qty = await ColumnAsync("Qty");

        await Fresh().Datasets.UpdateColumnAsync(_datasetId, qty, "Qty", DatasetColumnType.String);

        var schema = await SchemaAsync();
        var total = schema.Columns.Single(c => c.Name == "Total");
        Assert.Contains("needs numbers", total.FormulaError);
        Assert.Equal([null, null, null], await ColumnValuesAsync("Total")); // a broken formula leaves no stale values behind
        Assert.Null(schema.Columns.Single(c => c.Name == "Shout").FormulaError);

        // Retyping it back heals the column.
        await Fresh().Datasets.UpdateColumnAsync(_datasetId, qty, "Qty", DatasetColumnType.Int);
        Assert.Null((await SchemaAsync()).Columns.Single(c => c.Name == "Total").FormulaError);
        Assert.Equal(["21", "12", null], await ColumnValuesAsync("Total"));
    }

    [Fact]
    public async Task A_computed_columns_type_cant_be_changed_from_the_plain_column_endpoint()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");

        var ex = await Assert.ThrowsAsync<DataValidationException>(async () =>
            await Fresh().Datasets.UpdateColumnAsync(_datasetId, await ColumnAsync("Total"), "Total", DatasetColumnType.String));
        Assert.Contains("edit the formula", ex.Message);
    }

    [Fact]
    public async Task Adding_a_missing_column_heals_a_formula_that_was_waiting_for_it()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");
        // Simulate a formula left pointing at a column that no longer exists.
        var qty = await ColumnAsync("Qty");
        await Fresh().Datasets.UpdateColumnAsync(_datasetId, qty, "Units", DatasetColumnType.Int);
        var total = await Db.DatasetColumns.SingleAsync(c => c.Name == "Total");
        total.FormulaExpression = "[Gone] * [Price]";
        await Db.SaveChangesAsync();
        await Fresh().Formulas.RecalculateAsync(_datasetId);
        Assert.Contains("[Gone]", (await SchemaAsync()).Columns.Single(c => c.Name == "Total").FormulaError);

        await Fresh().Datasets.AddColumnAsync(_datasetId, "Gone", DatasetColumnType.Double);

        Assert.Null((await SchemaAsync()).Columns.Single(c => c.Name == "Total").FormulaError);
    }

    [Fact]
    public async Task Cloning_a_dataset_keeps_its_formula_columns_and_values()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");

        var copy = (await Fresh().Datasets.CloneAsync(_datasetId, "Copy"))!;

        var schema = (await Fresh().Datasets.GetSchemaAsync(copy.Id))!;
        Assert.Equal("[Qty] * [Price]", schema.Columns.Single(c => c.Name == "Total").Formula);
        var window = (await Fresh().Rows.GetRowWindowAsync(copy.Id, 0, 10))!;
        var totalId = schema.Columns.Single(c => c.Name == "Total").Id;
        Assert.Equal(["21", "12", null], window.Rows.Select(r => r.Values.GetValueOrDefault(totalId)));
    }

    // --- the database drives the function catalogue ---

    [Fact]
    public async Task The_catalogue_is_seeded_into_the_database_and_served_from_it()
    {
        var (functions, parameters) = FormulaFunctionSeedData.Rows();
        Assert.Equal(functions.Count, await Db.FormulaFunctionDefinitions.CountAsync());
        Assert.Equal(parameters.Count, await Db.FormulaFunctionParameters.CountAsync());

        var served = await Fresh().Formulas.GetFunctionsAsync();
        Assert.Equal(functions.Count, served.Count);
        Assert.Contains(served, f => f.Name == "ROUND" && f.Parameters.Count == 2 && f.Parameters[1].IsOptional);
    }

    [Fact]
    public async Task Editing_a_definition_in_the_database_changes_what_formulas_may_do()
    {
        await SeedAsync();
        await AddFormulaAsync("Rounded", "ROUND([Price])");
        Assert.Equal(["11", "4", "7"], await ColumnValuesAsync("Rounded"));

        // Take ROUND out of service (a data change, no deploy) and recalculate.
        Db.ChangeTracker.Clear();
        (await Db.FormulaFunctionDefinitions.SingleAsync(f => f.Name == "ROUND")).IsEnabled = false;
        await Db.SaveChangesAsync();

        await Fresh().Formulas.RecalculateAsync(_datasetId);
        var broken = (await SchemaAsync()).Columns.Single(c => c.Name == "Rounded");
        Assert.Contains("disabled", broken.FormulaError);
        Assert.Equal([null, null, null], await ColumnValuesAsync("Rounded"));
        Assert.DoesNotContain(await Fresh().Formulas.GetFunctionsAsync(), f => f.Name == "ROUND");
        await Assert.ThrowsAsync<DataValidationException>(() => AddFormulaAsync("Again", "ROUND([Price])"));

        // Put it back and the column recovers.
        Db.ChangeTracker.Clear();
        (await Db.FormulaFunctionDefinitions.SingleAsync(f => f.Name == "ROUND")).IsEnabled = true;
        await Db.SaveChangesAsync();
        await Fresh().Formulas.RecalculateAsync(_datasetId);
        Assert.Null((await SchemaAsync()).Columns.Single(c => c.Name == "Rounded").FormulaError);
        Assert.Equal(["11", "4", "7"], await ColumnValuesAsync("Rounded"));
    }

    // --- preview ---

    [Fact]
    public async Task Preview_evaluates_a_sample_without_saving_anything()
    {
        await SeedAsync();

        var preview = (await Fresh().Formulas.PreviewAsync(_datasetId, new FormulaPreviewRequestDto { Expression = "[Qty] * [Price]", SampleSize = 2 }))!;

        Assert.True(preview.IsValid);
        Assert.Equal(DatasetColumnType.Double, preview.InferredType);
        Assert.Equal(["21", "12"], preview.Rows.Select(r => r.Value));
        Assert.DoesNotContain(Db.DatasetColumns, c => c.FormulaExpression != null);
    }

    [Fact]
    public async Task Preview_reports_problems_as_structured_errors_rather_than_failing()
    {
        await SeedAsync();

        var preview = (await Fresh().Formulas.PreviewAsync(_datasetId, new FormulaPreviewRequestDto { Expression = "[Qty] + [Nope]" }))!;

        Assert.False(preview.IsValid);
        var error = Assert.Single(preview.Errors);
        Assert.Contains("[Nope]", error.Message);
        Assert.Equal(8, error.Position);
        Assert.Equal(6, error.Length);
        Assert.Empty(preview.Rows);
    }

    [Fact]
    public async Task Preview_reports_a_per_row_failure_on_that_row_only()
    {
        await SeedAsync();

        var preview = (await Fresh().Formulas.PreviewAsync(_datasetId,
            new FormulaPreviewRequestDto { Expression = "DATEADD(\"fortnight\", 1, [Ordered])" }))!;

        Assert.True(preview.IsValid); // the unit is only known at run time
        Assert.Contains("fortnight", preview.Rows[0].Error);
        Assert.Null(preview.Rows[2].Error); // a blank date short-circuits before the unit is even looked at
    }

    [Fact]
    public async Task Preview_can_read_existing_formula_columns()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");

        var preview = (await Fresh().Formulas.PreviewAsync(_datasetId, new FormulaPreviewRequestDto { Expression = "[Total] + 1" }))!;

        Assert.Equal(["22", "13", null], preview.Rows.Select(r => r.Value));
    }

    [Fact]
    public async Task Missing_datasets_and_columns_read_as_not_found()
    {
        await SeedAsync();

        Assert.Null(await Fresh().Formulas.AddAsync(9999, new SaveFormulaColumnDto { Name = "X", Expression = "1" }));
        Assert.Null(await Fresh().Formulas.PreviewAsync(9999, new FormulaPreviewRequestDto { Expression = "1" }));
        Assert.Null(await Fresh().Formulas.UpdateAsync(_datasetId, Guid.NewGuid(), new SaveFormulaColumnDto { Name = "X", Expression = "1" }));
        Assert.Null(await Fresh().Formulas.RecalculateAsync(9999));
    }

    [Fact]
    public async Task A_dataset_larger_than_one_batch_is_fully_computed()
    {
        await SeedAsync();
        var dataset = await Db.Datasets.Include(d => d.Columns).SingleAsync(d => d.Id == _datasetId);
        var qtyId = dataset.Columns.Single(c => c.Name == "Qty").Id;
        var priceId = dataset.Columns.Single(c => c.Name == "Price").Id;

        for (var i = 0; i < 1200; i++)
        {
            var row = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = _datasetId };
            row.Cells.Add(CellValues.Create(qtyId, "2", DatasetColumnType.Int));
            row.Cells.Add(CellValues.Create(priceId, "3", DatasetColumnType.Double));
            Db.DatasetRows.Add(row);
        }
        await Db.SaveChangesAsync();

        await AddFormulaAsync("Total", "[Qty] * [Price]");

        var totalId = await Db.DatasetColumns.Where(c => c.Name == "Total").Select(c => c.Id).SingleAsync();
        var totals = await Db.DatasetCells.Where(c => c.ColumnId == totalId).Select(c => c.StringValue).ToListAsync();
        Assert.Equal(1202, totals.Count); // every row with a Qty (the seeded blank-Qty row stays blank)
        Assert.Equal(1200, totals.Count(v => v == "6"));
    }
}
