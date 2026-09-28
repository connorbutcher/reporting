using Reporting.DAL.Formulas.Analysis;
using Reporting.DAL.Formulas.Catalogue;
using Reporting.DAL.Formulas.Evaluation;
using Reporting.DAL.Formulas.Functions;

namespace Reporting.Tests.Formulas;

/// <summary>What a function definition says decides what a formula may do: disabling it, or pointing it elsewhere, needs no code change.</summary>
public class FormulaCatalogueAvailabilityTests
{
    [Fact]
    public void A_disabled_definition_makes_its_function_unavailable_to_formulas()
    {
        var functions = FormulaTestHarness.SeededDefinitions();
        functions.Single(f => f.Name == "ROUND").IsEnabled = false;

        var catalogue = FormulaFunctionCatalogue.Build(functions, FormulaFunctionImplementations.All);
        var analysis = FormulaAnalyzer.Analyze("ROUND(1.5)", [], catalogue);

        Assert.False(analysis.IsValid);
        Assert.Contains("disabled", analysis.ErrorMessage);
        Assert.Null(catalogue.Find("ROUND"));
    }

    [Fact]
    public void A_definition_with_no_server_implementation_is_unavailable()
    {
        var functions = FormulaTestHarness.SeededDefinitions();
        functions.Single(f => f.Name == "ROUND").ImplementationKey = "NO_SUCH_IMPLEMENTATION";

        var catalogue = FormulaFunctionCatalogue.Build(functions, FormulaFunctionImplementations.All);
        var analysis = FormulaAnalyzer.Analyze("ROUND(1.5)", [], catalogue);

        Assert.Contains("no implementation", analysis.ErrorMessage);
    }

    [Fact]
    public void A_definition_can_route_a_name_to_a_different_implementation()
    {
        var functions = FormulaTestHarness.SeededDefinitions();
        var round = functions.Single(f => f.Name == "ROUND");
        round.ImplementationKey = "CEILING";
        round.Parameters = round.Parameters.Take(1).ToList();

        var catalogue = FormulaFunctionCatalogue.Build(functions, FormulaFunctionImplementations.All);
        var analysis = FormulaAnalyzer.Analyze("ROUND(1.2)", [], catalogue);

        Assert.Equal(2.0, new FormulaEvaluator(catalogue).Evaluate(analysis, column => null));
    }

    [Fact]
    public void A_definition_can_change_how_blanks_are_handled()
    {
        var functions = FormulaTestHarness.SeededDefinitions();
        functions.Single(f => f.Name == "SUM").PropagatesNull = true;

        var catalogue = FormulaFunctionCatalogue.Build(functions, FormulaFunctionImplementations.All);
        var analysis = FormulaAnalyzer.Analyze("SUM(1, NULL, 3)", [], catalogue);

        Assert.Null(new FormulaEvaluator(catalogue).Evaluate(analysis, column => null));
    }
}
