using Reporting.Abstractions;
using Reporting.DAL.Formulas.Analysis;
using Reporting.DAL.Formulas.Catalogue;
using Reporting.DAL.Formulas.Functions;
using Reporting.Database;

namespace Reporting.Tests.Formulas;

/// <summary>The seeded function catalogue and the server's implementations must describe the same set of functions.</summary>
public class FormulaSeedConsistencyTests
{
    private static readonly FormulaFunctionCatalogue Catalogue = FormulaTestHarness.Catalogue;

    [Fact]
    public void Every_seeded_function_has_a_server_implementation()
    {
        var (functions, _) = FormulaFunctionSeedData.Rows();

        var missing = functions
            .Where(f => !FormulaFunctionImplementations.All.ContainsKey(f.ImplementationKey))
            .Select(f => f.Name);

        Assert.Empty(missing);
        Assert.Equal(functions.Count, Catalogue.All.Count);
    }

    [Fact]
    public void Every_implementation_is_reachable_through_a_seeded_definition()
    {
        var (functions, _) = FormulaFunctionSeedData.Rows();
        var keys = functions.Select(f => f.ImplementationKey).ToHashSet(StringComparer.OrdinalIgnoreCase);

        Assert.Empty(FormulaFunctionImplementations.All.Keys.Where(k => !keys.Contains(k)));
    }

    [Fact]
    public void Seeded_function_examples_all_parse_and_check()
    {
        // The examples are documentation shown to users; they must be formulas the engine accepts.
        var columns = FormulaExampleColumns.Build();

        foreach (var function in Catalogue.All)
        {
            var analysis = FormulaAnalyzer.Analyze(function.Definition.Example, columns, Catalogue);
            Assert.True(analysis.IsValid, $"{function.Name}: {function.Definition.Example} — {analysis.ErrorMessage}");
        }
    }

    [Fact]
    public void The_catalogue_dto_carries_signatures_for_the_builder()
    {
        var dtos = Catalogue.ToDtos();

        var round = dtos.Single(f => f.Name == "ROUND");
        Assert.Equal(FormulaFunctionCategory.Math, round.Category);
        Assert.Equal(FormulaValueKind.Number, round.ReturnKind);
        Assert.Equal(["number", "digits"], round.Parameters.Select(p => p.Name));
        Assert.True(round.Parameters[1].IsOptional);

        Assert.True(dtos.Single(f => f.Name == "SUM").Parameters.Single().IsVariadic);
    }

    [Fact]
    public void A_functions_signature_reads_as_a_call()
    {
        Assert.Equal("ROUND(number, [digits])", Catalogue.Find("ROUND")!.Signature);
        Assert.Equal("SUM(number, …)", Catalogue.Find("SUM")!.Signature);
        Assert.Equal("PI()", Catalogue.Find("PI")!.Signature);
    }

    [Fact]
    public void A_functions_argument_limits_come_from_its_parameters()
    {
        var round = Catalogue.Find("ROUND")!;
        Assert.Equal(1, round.MinArguments);
        Assert.Equal(2, round.MaxArguments);

        var sum = Catalogue.Find("SUM")!;
        Assert.Equal(1, sum.MinArguments);
        Assert.Null(sum.MaxArguments);
        Assert.True(sum.IsVariadic);
    }
}
