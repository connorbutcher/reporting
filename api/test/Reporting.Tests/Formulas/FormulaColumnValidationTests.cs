using Reporting.Abstractions;
using Reporting.DAL.Repositories;

namespace Reporting.Tests.Formulas;

/// <summary>A formula column is checked before it is saved; a rejected one leaves the dataset as it was.</summary>
public class FormulaColumnValidationTests : FormulaColumnTestBase
{
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
    public async Task A_circular_reference_between_formula_columns_is_rejected()
    {
        await SeedAsync();
        await AddFormulaAsync("A", "[Qty] + 1");
        await AddFormulaAsync("B", "[A] + 1");

        var ex = await Assert.ThrowsAsync<DataValidationException>(async () =>
            await UpdateFormulaAsync(await ColumnAsync("A"), "A", "[B] + 1"));

        Assert.Contains("circular", ex.Message);
        await AssertFormulaUnchangedAsync("A", "[Qty] + 1", ["3", "4", null]);
    }

    [Fact]
    public async Task A_formula_that_reads_its_own_column_is_rejected()
    {
        await SeedAsync();
        await AddFormulaAsync("A", "[Qty] + 1");

        var ex = await Assert.ThrowsAsync<DataValidationException>(async () =>
            await UpdateFormulaAsync(await ColumnAsync("A"), "A", "[A] + 1"));

        Assert.Contains("refers to itself", ex.Message);
        await AssertFormulaUnchangedAsync("A", "[Qty] + 1", ["3", "4", null]);
    }

    [Fact]
    public async Task Updating_a_plain_column_as_a_formula_is_refused()
    {
        await SeedAsync();
        var qty = await ColumnAsync("Qty");

        var ex = await Assert.ThrowsAsync<DataValidationException>(async () => await UpdateFormulaAsync(qty, "Qty", "1"));

        Assert.Contains("isn't a formula column", ex.Message);
    }

    [Fact]
    public async Task Missing_datasets_and_columns_read_as_not_found()
    {
        await SeedAsync();
        var dto = new SaveFormulaColumnDto { Name = "X", Expression = "1" };

        Assert.Null(await Fresh().Formulas.AddAsync(9999, dto));
        Assert.Null(await Fresh().Formulas.UpdateAsync(DatasetId, Guid.NewGuid(), dto));
        Assert.Null(await Fresh().Formulas.RecalculateAsync(9999));
    }

    /// <summary>A rejected edit changed nothing: the column still has its old formula and its old values.</summary>
    private async Task AssertFormulaUnchangedAsync(string column, string formula, List<string?> values)
    {
        Assert.Equal(formula, (await ColumnDtoAsync(column)).Formula);
        Assert.Equal(values, await ColumnValuesAsync(column));
    }
}
