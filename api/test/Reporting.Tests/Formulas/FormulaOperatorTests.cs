using Reporting.Abstractions;
using static Reporting.Tests.Formulas.FormulaTestHarness;

namespace Reporting.Tests.Formulas;

/// <summary>The operators of the formula language: precedence, blanks, and what they do with text.</summary>
public class FormulaOperatorTests
{
    [Theory]
    [InlineData("1 + 2 * 3", 7.0)]
    [InlineData("(1 + 2) * 3", 9.0)]
    [InlineData("2 ^ 3 ^ 2", 512.0)]
    [InlineData("-2 ^ 2", -4.0)]
    [InlineData("10 % 4", 2.0)]
    [InlineData("-7 % 3", 2.0)]
    [InlineData("1.5e2 + .5", 150.5)]
    [InlineData("10 / 4", 2.5)]
    public void Arithmetic_follows_conventional_precedence(string expression, double expected)
    {
        Assert.Equal(expected, Run(expression));
    }

    [Fact]
    public void Division_by_zero_is_blank_not_an_error()
    {
        Assert.Null(Run("1 / 0"));
    }

    [Fact]
    public void A_guarded_division_still_works_even_though_every_branch_is_evaluated()
    {
        var result = Run(
            "IF([Qty] = 0, 0, [Total] / [Qty])",
            new FormulaTestInput("Qty", 0.0),
            new FormulaTestInput("Total", 10.0));

        Assert.Equal(0.0, result);
    }

    [Theory]
    [InlineData("1 < 2 AND 2 < 3", true)]
    [InlineData("1 > 2 OR 2 < 3", true)]
    [InlineData("NOT 1 > 2", true)]
    [InlineData("NOT(1 > 2)", true)]
    [InlineData("1 = 1 AND NOT 2 = 2", false)]
    [InlineData("\"abc\" = \"ABC\"", true)]
    [InlineData("\"a\" < \"b\"", true)]
    [InlineData("1 <> 2", true)]
    [InlineData("1 != 2", true)]
    [InlineData("TRUE OR FALSE AND FALSE", true)]
    public void Comparison_and_logic(string expression, bool expected)
    {
        Assert.Equal(expected, Run(expression));
    }

    [Fact]
    public void Ampersand_joins_text_and_treats_blanks_as_empty()
    {
        var result = Run("[A] & [B] & 5", new FormulaTestInput("A", "a"), new FormulaTestInput("B", "b"));

        Assert.Equal("ab5", result);
    }

    [Fact]
    public void String_literals_may_contain_escaped_quotes()
    {
        Assert.Equal("say \"hi\"", Run("\"say \"\"hi\"\"\""));
    }

    [Fact]
    public void Blank_propagates_through_operators_and_strict_functions()
    {
        Assert.Null(Run("[A] + 1", new FormulaTestInput("A", null, DatasetColumnType.Double)));
        Assert.Null(Run("ROUND([N])", new FormulaTestInput("N", null, DatasetColumnType.Double)));
    }
}
