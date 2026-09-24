using Reporting.Abstractions;
using Reporting.DAL.Formulas.Analysis;
using Reporting.Database;
using static Reporting.Tests.Formulas.FormulaTestHarness;

namespace Reporting.Tests.Formulas;

/// <summary>Checking a formula against the columns and the function catalogue, before it runs.</summary>
public class FormulaAnalysisTests
{
    [Fact]
    public void Unknown_columns_and_functions_are_reported_together()
    {
        var analysis = Check("NOPE([Missing]) + [Also Missing]");

        Assert.Equal(3, analysis.Errors.Count);
        Assert.Contains(analysis.Errors, e => e.Message.Contains("no function named NOPE"));
        Assert.Contains(analysis.Errors, e => e.Message.Contains("[Missing]"));
        Assert.Contains(analysis.Errors, e => e.Message.Contains("[Also Missing]"));
    }

    [Theory]
    [InlineData("ROUND()")]
    [InlineData("ROUND(1, 2, 3)")]
    [InlineData("IF(TRUE, 1)")]
    [InlineData("PI(1)")]
    [InlineData("SUM()")]
    public void Wrong_argument_counts_are_reported_from_the_catalogue_signature(string expression)
    {
        var analysis = Check(expression);

        Assert.False(analysis.IsValid);
        Assert.Contains("argument", analysis.ErrorMessage);
    }

    [Fact]
    public void Argument_kinds_are_checked_against_the_parameter_kinds()
    {
        Assert.Contains("needs a number", Check("ROUND([Name])", ("Name", DatasetColumnType.String)).ErrorMessage);
        Assert.Contains("needs text", Check("UPPER([N])", ("N", DatasetColumnType.Int)).ErrorMessage);
        Assert.Contains("needs a true/false", Check("IF([N], 1, 2)", ("N", DatasetColumnType.Int)).ErrorMessage);
    }

    [Fact]
    public void Operand_kinds_are_checked_too()
    {
        Assert.Contains("Can't compare", Check("[N] = \"x\"", ("N", DatasetColumnType.Int)).ErrorMessage);
        Assert.Contains("needs numbers", Check("[S] * 2", ("S", DatasetColumnType.String)).ErrorMessage);
        Assert.Contains("can't order true/false", Check("[B] > TRUE", ("B", DatasetColumnType.Bool)).ErrorMessage);
    }

    [Fact]
    public void An_ambiguous_column_name_is_refused()
    {
        var analysis = Check("[A] + 1", ("A", DatasetColumnType.Int), ("a", DatasetColumnType.Int));

        Assert.Contains("More than one column", analysis.ErrorMessage);
    }

    [Theory]
    [InlineData("1 + 2", FormulaValueKind.Number)]
    [InlineData("\"a\" & \"b\"", FormulaValueKind.Text)]
    [InlineData("1 < 2", FormulaValueKind.Bool)]
    [InlineData("YEAR([D])", FormulaValueKind.Number)]
    [InlineData("DATEADD(\"day\", 1, [D])", FormulaValueKind.Date)]
    [InlineData("IF(TRUE, 1, 2)", FormulaValueKind.Number)]
    [InlineData("IF(TRUE, 1, \"x\")", FormulaValueKind.Any)]
    [InlineData("IF(TRUE, NULL, 2)", FormulaValueKind.Number)]
    [InlineData("COALESCE([S], \"fallback\")", FormulaValueKind.Text)]
    [InlineData("ISBLANK([S])", FormulaValueKind.Bool)]
    public void The_result_kind_is_inferred_from_the_catalogue(string expression, FormulaValueKind expected)
    {
        var analysis = Check(expression, ("D", DatasetColumnType.DateTime), ("S", DatasetColumnType.String));

        Assert.True(analysis.IsValid, analysis.ErrorMessage);
        Assert.Equal(expected, analysis.ResultKind);
    }

    [Fact]
    public void A_result_that_doesnt_fit_the_declared_column_type_is_refused()
    {
        var columns = new[] { new DatasetColumn { Id = 1, Name = "N", Type = DatasetColumnType.Int } };

        Assert.Contains("doesn't fit", FormulaAnalyzer.Analyze("[N] > 1", columns, Catalogue, DatasetColumnType.Double).ErrorMessage);
        Assert.True(FormulaAnalyzer.Analyze("[N] + 1", columns, Catalogue, DatasetColumnType.Int).IsValid);

        // A text column takes anything, as its canonical text.
        Assert.True(FormulaAnalyzer.Analyze("[N] > 1", columns, Catalogue, DatasetColumnType.String).IsValid);
    }

    [Fact]
    public void Analysis_lists_the_columns_a_formula_reads_once_each()
    {
        var qty = new DatasetColumn { Id = 1, Name = "Qty", Type = DatasetColumnType.Int };
        var price = new DatasetColumn { Id = 2, Name = "Price", Type = DatasetColumnType.Double };

        var analysis = FormulaAnalyzer.Analyze("[Qty] * [Price] + [qty]", [qty, price], Catalogue);

        Assert.Equal([qty, price], analysis.References);
    }

    [Fact]
    public void An_indexed_set_of_columns_can_be_reused_across_formulas()
    {
        var index = new FormulaColumnIndex([new DatasetColumn { Id = 1, Name = "Qty", Type = DatasetColumnType.Int }]);

        Assert.True(FormulaAnalyzer.Analyze("[Qty] + 1", index, Catalogue).IsValid);
        Assert.False(FormulaAnalyzer.Analyze("[Nope] + 1", index, Catalogue).IsValid);
    }
}
