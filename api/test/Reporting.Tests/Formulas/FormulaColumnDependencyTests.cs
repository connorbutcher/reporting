using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Repositories;

namespace Reporting.Tests.Formulas;

/// <summary>Formula columns follow the columns they read: renames, removals, retypes, and cloning.</summary>
public class FormulaColumnDependencyTests : FormulaColumnTestBase
{
    [Fact]
    public async Task Renaming_a_column_rewrites_the_formulas_that_read_it()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");

        await Fresh().Datasets.UpdateColumnAsync(DatasetId, await ColumnAsync("Qty"), "Units", DatasetColumnType.Int);

        var total = await ColumnDtoAsync("Total");
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

        await UpdateFormulaAsync(await ColumnAsync("Total"), "Net", "[Qty] * [Price]");

        var withTax = await ColumnDtoAsync("With Tax");
        Assert.Equal("[Net] * 1.2", withTax.Formula);
        Assert.Null(withTax.FormulaError);
    }

    [Fact]
    public async Task A_column_a_formula_reads_cant_be_deleted()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");

        var ex = await Assert.ThrowsAsync<DataConflictException>(async () =>
            await Fresh().Datasets.DeleteColumnAsync(DatasetId, await ColumnAsync("Qty")));

        Assert.Contains("[Total]", ex.Message);
    }

    [Fact]
    public async Task Removing_the_formula_first_frees_the_column_it_read()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");

        Assert.True(await Fresh().Datasets.DeleteColumnAsync(DatasetId, await ColumnAsync("Total")));
        Assert.True(await Fresh().Datasets.DeleteColumnAsync(DatasetId, await ColumnAsync("Qty")));
    }

    [Fact]
    public async Task Retyping_an_input_flags_the_dependents_that_no_longer_fit_and_leaves_no_stale_values()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");
        await AddFormulaAsync("Shout", "UPPER([Region])");

        await Fresh().Datasets.UpdateColumnAsync(DatasetId, await ColumnAsync("Qty"), "Qty", DatasetColumnType.String);

        Assert.Contains("needs numbers", (await ColumnDtoAsync("Total")).FormulaError);
        Assert.Equal([null, null, null], await ColumnValuesAsync("Total"));
        Assert.Null((await ColumnDtoAsync("Shout")).FormulaError);
    }

    [Fact]
    public async Task Retyping_the_input_back_heals_the_column()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");
        var qty = await ColumnAsync("Qty");
        await Fresh().Datasets.UpdateColumnAsync(DatasetId, qty, "Qty", DatasetColumnType.String);

        await Fresh().Datasets.UpdateColumnAsync(DatasetId, qty, "Qty", DatasetColumnType.Int);

        Assert.Null((await ColumnDtoAsync("Total")).FormulaError);
        Assert.Equal(["21", "12", null], await ColumnValuesAsync("Total"));
    }

    [Fact]
    public async Task A_computed_columns_type_cant_be_changed_from_the_plain_column_endpoint()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");

        var ex = await Assert.ThrowsAsync<DataValidationException>(async () =>
            await Fresh().Datasets.UpdateColumnAsync(DatasetId, await ColumnAsync("Total"), "Total", DatasetColumnType.String));

        Assert.Contains("edit the formula", ex.Message);
    }

    [Fact]
    public async Task Adding_a_missing_column_heals_a_formula_that_was_waiting_for_it()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");
        await PointFormulaAtMissingColumnAsync("Total", "[Gone] * [Price]");
        Assert.Contains("[Gone]", (await ColumnDtoAsync("Total")).FormulaError);

        await Fresh().Datasets.AddColumnAsync(DatasetId, "Gone", DatasetColumnType.Double);

        Assert.Null((await ColumnDtoAsync("Total")).FormulaError);
    }

    [Fact]
    public async Task Cloning_a_dataset_keeps_its_formula_columns_and_values()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");

        var copy = (await Fresh().Datasets.CloneAsync(DatasetId, "Copy"))!;

        var schema = (await Fresh().Datasets.GetSchemaAsync(copy.Id))!;
        var total = schema.Columns.Single(c => c.Name == "Total");
        Assert.Equal("[Qty] * [Price]", total.Formula);

        var window = (await Fresh().Rows.GetRowWindowAsync(copy.Id, 0, 10))!;
        Assert.Equal(["21", "12", null], window.Rows.Select(r => r.Values.GetValueOrDefault(total.Id)));
    }

    /// <summary>Leaves a formula reading a column that doesn't exist, as it would be after that column was removed some other way.</summary>
    private async Task PointFormulaAtMissingColumnAsync(string column, string formula)
    {
        Db.ChangeTracker.Clear();
        var entity = await Db.DatasetColumns.SingleAsync(c => c.Name == column);
        entity.FormulaExpression = formula;
        await Db.SaveChangesAsync();

        await Fresh().Formulas.RecalculateAsync(DatasetId);
    }
}
