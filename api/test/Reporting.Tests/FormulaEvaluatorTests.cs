using Reporting.DAL.Formulas;

namespace Reporting.Tests;

/// <summary>Exercises evaluation semantics: null propagation, three-valued AND/OR/IF, comparisons,
/// and the whitelisted function library — independent of any dataset/database plumbing.</summary>
public class FormulaEvaluatorTests
{
    private static object? Eval(string expression, Dictionary<string, object?>? values = null) =>
        FormulaEvaluator.Evaluate(FormulaParser.Parse(expression), values ?? new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase));

    [Fact]
    public void Evaluates_arithmetic_with_precedence()
    {
        Assert.Equal(14.0, Eval("2 + 3 * 4"));
    }

    [Fact]
    public void Division_by_zero_throws()
    {
        Assert.Throws<FormulaEvaluationException>(() => Eval("1 / 0"));
    }

    [Fact]
    public void Column_reference_resolves_from_the_row_values()
    {
        var values = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["Measured"] = 12.5,
            ["Nominal"] = 12.0,
        };

        Assert.Equal(0.5, (double)Eval("[Measured] - [Nominal]", values)!, precision: 10);
    }

    [Fact]
    public void Null_propagates_through_arithmetic()
    {
        var values = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase) { ["Measured"] = null };

        Assert.Null(Eval("[Measured] - 1", values));
    }

    [Fact]
    public void Null_propagates_through_ordinary_function_calls()
    {
        var values = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase) { ["Measured"] = null };

        Assert.Null(Eval("ROUND([Measured], 2)", values));
    }

    [Theory]
    [InlineData("FALSE AND [Unknown]", false)] // FALSE short-circuits even when the other side is blank
    [InlineData("TRUE OR [Unknown]", true)]    // TRUE short-circuits OR the same way
    public void And_or_short_circuit_on_a_deciding_operand(string expression, bool expected)
    {
        var values = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase) { ["Unknown"] = null };

        Assert.Equal(expected, Eval(expression, values));
    }

    [Fact]
    public void And_with_a_blank_non_deciding_operand_is_null()
    {
        var values = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase) { ["Unknown"] = null };

        Assert.Null(Eval("TRUE AND [Unknown]", values));
    }

    [Fact]
    public void If_with_null_condition_is_null()
    {
        var values = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase) { ["Cond"] = null };

        Assert.Null(Eval("IF([Cond], 1, 2)", values));
    }

    [Fact]
    public void If_picks_the_matching_branch()
    {
        Assert.Equal(1.0, Eval("IF(TRUE, 1, 2)"));
        Assert.Equal(2.0, Eval("IF(FALSE, 1, 2)"));
    }

    [Theory]
    [InlineData("1 < 2", true)]
    [InlineData("2 < 1", false)]
    [InlineData("2 = 2", true)]
    [InlineData("2 <> 2", false)]
    public void Numeric_comparisons(string expression, bool expected)
    {
        Assert.Equal(expected, Eval(expression));
    }

    [Fact]
    public void String_comparison_is_ordinal()
    {
        Assert.True((bool)Eval("\"Apple\" < \"Banana\"")!);
    }

    [Fact]
    public void Round_uses_away_from_zero_midpoint_rounding()
    {
        Assert.Equal(2.5, Eval("ROUND(2.45, 1)"));
    }

    [Fact]
    public void Round_digits_must_be_a_whole_number()
    {
        Assert.Throws<FormulaEvaluationException>(() => Eval("ROUND(1.2345, 1.5)"));
    }

    [Fact]
    public void Concat_joins_mixed_types_as_text()
    {
        Assert.Equal("R-7: 3.5", Eval("CONCAT(\"R-7: \", 3.5)"));
    }

    [Fact]
    public void Min_and_max_take_variable_argument_counts()
    {
        Assert.Equal(1.0, Eval("MIN(4, 1, 7, 2)"));
        Assert.Equal(7.0, Eval("MAX(4, 1, 7, 2)"));
    }

    [Fact]
    public void Datediff_supports_days_months_years()
    {
        var values = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["Start"] = new DateTime(2026, 1, 1),
            ["End"] = new DateTime(2027, 3, 1),
        };

        Assert.Equal(14.0, Eval("DATEDIFF(\"months\", [Start], [End])", values));
    }

    [Fact]
    public void Unknown_function_throws()
    {
        Assert.Throws<FormulaEvaluationException>(() => Eval("NOPE(1)"));
    }

    [Fact]
    public void Wrong_arity_throws()
    {
        Assert.Throws<FormulaEvaluationException>(() => Eval("POWER(2)"));
    }

    [Fact]
    public void Type_mismatch_throws()
    {
        Assert.Throws<FormulaEvaluationException>(() => Eval("1 + \"text\""));
    }
}
