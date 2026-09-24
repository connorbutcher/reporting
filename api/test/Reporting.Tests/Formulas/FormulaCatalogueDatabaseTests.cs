using Microsoft.EntityFrameworkCore;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.Tests.Formulas;

/// <summary>The function catalogue lives in the database: it is seeded there, served from there, and editing a definition changes what formulas may do.</summary>
public class FormulaCatalogueDatabaseTests : FormulaColumnTestBase
{
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
    public async Task Disabling_a_definition_breaks_the_formulas_that_use_it_and_enabling_it_heals_them()
    {
        await SeedAsync();
        await AddFormulaAsync("Rounded", "ROUND([Price])");
        Assert.Equal(["11", "4", "7"], await ColumnValuesAsync("Rounded"));

        // Take ROUND out of service (a data change, no deploy) and recalculate.
        await SetEnabledAsync("ROUND", false);
        await Fresh().Formulas.RecalculateAsync(DatasetId);

        Assert.Contains("disabled", (await ColumnDtoAsync("Rounded")).FormulaError);
        Assert.Equal([null, null, null], await ColumnValuesAsync("Rounded"));

        // Put it back and the column recovers.
        await SetEnabledAsync("ROUND", true);
        await Fresh().Formulas.RecalculateAsync(DatasetId);

        Assert.Null((await ColumnDtoAsync("Rounded")).FormulaError);
        Assert.Equal(["11", "4", "7"], await ColumnValuesAsync("Rounded"));
    }

    [Fact]
    public async Task A_disabled_function_is_no_longer_offered_or_accepted()
    {
        await SeedAsync();
        await SetEnabledAsync("ROUND", false);

        Assert.DoesNotContain(await Fresh().Formulas.GetFunctionsAsync(), f => f.Name == "ROUND");
        await Assert.ThrowsAsync<DataValidationException>(() => AddFormulaAsync("Again", "ROUND([Price])"));
    }

    private async Task SetEnabledAsync(string functionName, bool enabled)
    {
        Db.ChangeTracker.Clear();
        var definition = await Db.FormulaFunctionDefinitions.SingleAsync(f => f.Name == functionName);
        definition.IsEnabled = enabled;
        await Db.SaveChangesAsync();
    }
}
