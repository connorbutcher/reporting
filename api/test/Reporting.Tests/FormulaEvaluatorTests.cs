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

    [Theory]
    [InlineData("CEILING(1.2)", 2.0)]
    [InlineData("FLOOR(1.8)", 1.0)]
    [InlineData("MOD(7, 3)", 1.0)]
    [InlineData("SQRT(9)", 3.0)]
    public void Math_functions(string expression, double expected)
    {
        Assert.Equal(expected, Eval(expression));
    }

    [Fact]
    public void Mod_by_zero_throws()
    {
        Assert.Throws<FormulaEvaluationException>(() => Eval("MOD(1, 0)"));
    }

    [Fact]
    public void Sqrt_of_negative_throws()
    {
        Assert.Throws<FormulaEvaluationException>(() => Eval("SQRT(-1)"));
    }

    [Theory]
    [InlineData("LEN(\"hello\")", 5.0)]
    public void Len_counts_characters(string expression, double expected)
    {
        Assert.Equal(expected, Eval(expression));
    }

    [Theory]
    [InlineData("LEFT(\"hello\", 3)", "hel")]
    [InlineData("LEFT(\"hi\", 10)", "hi")]
    [InlineData("RIGHT(\"hello\", 3)", "llo")]
    [InlineData("RIGHT(\"hi\", 10)", "hi")]
    [InlineData("REPLACE(\"a-b-c\", \"-\", \"_\")", "a_b_c")]
    public void Text_slicing_functions(string expression, string expected)
    {
        Assert.Equal(expected, Eval(expression));
    }

    [Theory]
    [InlineData("CONTAINS(\"Hello World\", \"world\")", true)]
    [InlineData("CONTAINS(\"Hello World\", \"xyz\")", false)]
    public void Contains_is_case_insensitive(string expression, bool expected)
    {
        Assert.Equal(expected, Eval(expression));
    }

    [Fact]
    public void Day_and_weekday_read_from_a_date()
    {
        var values = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["D"] = new DateTime(2026, 9, 15), // a Tuesday
        };

        Assert.Equal(15.0, Eval("DAY([D])", values));
        Assert.Equal(3.0, Eval("WEEKDAY([D])", values)); // 1=Sunday .. 7=Saturday
    }

    [Fact]
    public void Dateadd_supports_days_months_years_and_negative_amounts()
    {
        var values = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["D"] = new DateTime(2026, 1, 31),
        };

        Assert.Equal(new DateTime(2026, 2, 10), Eval("DATEADD(\"days\", 10, [D])", values));
        Assert.Equal(new DateTime(2025, 1, 31), Eval("DATEADD(\"years\", -1, [D])", values));
    }

    [Fact]
    public void Coalesce_returns_the_first_non_null_argument()
    {
        var values = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["A"] = null,
            ["B"] = 5.0,
        };

        Assert.Equal(5.0, Eval("COALESCE([A], [B], 99)", values));
    }

    [Fact]
    public void Coalesce_is_null_when_every_argument_is_null()
    {
        var values = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase) { ["A"] = null };

        Assert.Null(Eval("COALESCE([A], [A])", values));
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData(5.0, false)]
    public void Isblank_reflects_whether_the_argument_is_null(object? value, bool expected)
    {
        var values = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase) { ["A"] = value };

        Assert.Equal(expected, Eval("ISBLANK([A])", values));
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
