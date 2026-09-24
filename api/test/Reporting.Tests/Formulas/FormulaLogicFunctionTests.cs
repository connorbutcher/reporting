using Reporting.Abstractions;
using Reporting.DAL.Formulas.Analysis;
using Reporting.DAL.Formulas.Evaluation;
using Reporting.Database;
using static Reporting.Tests.Formulas.FormulaTestHarness;

namespace Reporting.Tests.Formulas;

/// <summary>The functions that give blanks meaning: IF, COALESCE, ISBLANK, and the three-valued AND / OR / NOT.</summary>
public class FormulaLogicFunctionTests
{
    [Theory]
    [InlineData("ISBLANK(NULL)", true)]
    [InlineData("ISBLANK(0)", false)]
    [InlineData("BETWEEN(5, 1, 10)", true)]
    [InlineData("BETWEEN(11, 1, 10)", false)]
    [InlineData("ONEOF(\"b\", \"a\", \"B\")", true)]
    [InlineData("ONEOF(3, 1, 2)", false)]
    public void Functions_returning_true_or_false(string expression, bool expected)
    {
        Assert.Equal(expected, Run(expression));
    }

    [Fact]
    public void IF_treats_a_blank_condition_as_false()
    {
        var result = Run("IF([B], \"yes\", \"no\")", new FormulaTestInput("B", null, DatasetColumnType.Bool));

        Assert.Equal("no", result);
    }

    [Fact]
    public void COALESCE_takes_the_first_value_that_is_not_blank()
    {
        Assert.Equal(5.0, RunNumbers("COALESCE([A], [B], [C])", null, 5.0, 7.0));
        Assert.Null(RunNumbers("COALESCE([A], [B])", null, null));
    }

    [Fact]
    public void AND_and_OR_use_three_valued_logic()
    {
        Assert.Equal(false, RunWithFlag("[A] AND FALSE", null));
        Assert.Null(RunWithFlag("[A] AND TRUE", null));
        Assert.Equal(true, RunWithFlag("[A] OR TRUE", null));
        Assert.Null(RunWithFlag("[A] OR FALSE", null));
    }

    [Fact]
    public void NOT_reverses_a_condition_and_leaves_a_blank_blank()
    {
        Assert.Null(RunWithFlag("NOT [A]", null));
        Assert.Equal(false, RunWithFlag("NOT [A]", true));
        Assert.Equal(true, RunWithFlag("NOT [A]", false));
    }

    [Fact]
    public void A_runtime_kind_mismatch_from_an_untyped_branch_fails_that_row()
    {
        // IF(...) is statically "Any" (branches differ), so ROUND accepts it — the row that takes the text branch fails.
        var columns = new[] { new DatasetColumn { Id = 1, Name = "N", Type = DatasetColumnType.Double } };
        var analysis = FormulaAnalyzer.Analyze("ROUND(IF([N] > 0, [N], \"none\"))", columns, Catalogue);
        Assert.True(analysis.IsValid, analysis.ErrorMessage);

        var evaluator = new FormulaEvaluator(Catalogue);
        Assert.Equal(3.0, evaluator.Evaluate(analysis, column => 2.6));
        Assert.Throws<FormulaEvaluationException>(() => evaluator.Evaluate(analysis, column => -1.0));
    }
}
