using static Reporting.Tests.Formulas.FormulaTestHarness;

namespace Reporting.Tests.Formulas;

/// <summary>The text functions. Positions are 1-based, as in a spreadsheet.</summary>
public class FormulaTextFunctionTests
{
    [Theory]
    [InlineData("UPPER(\"abc\")", "ABC")]
    [InlineData("LOWER(\"ABC\")", "abc")]
    [InlineData("PROPER(\"hELLO wORLD\")", "Hello World")]
    [InlineData("TRIM(\"  a   b  \")", "a b")]
    [InlineData("LEFT(\"abcdef\", 3)", "abc")]
    [InlineData("LEFT(\"ab\", 10)", "ab")]
    [InlineData("RIGHT(\"abcdef\", 2)", "ef")]
    [InlineData("MID(\"abcdef\", 2, 3)", "bcd")]
    [InlineData("MID(\"abc\", 2, 99)", "bc")]
    [InlineData("MID(\"abc\", 9, 1)", "")]
    [InlineData("CONCAT(\"a\", 1, TRUE)", "a1TRUE")]
    [InlineData("TEXTJOIN(\"-\", \"a\", NULL, \"b\")", "a-b")]
    [InlineData("TEXTJOIN(\",\", \"\", \"a\")", ",a")]
    [InlineData("REPLACE(\"a-b-c\", \"-\", \"\")", "abc")]
    [InlineData("REPEAT(\"ab\", 3)", "ababab")]
    [InlineData("PADLEFT(\"7\", 3, \"0\")", "007")]
    [InlineData("TEXT(3.14159, \"0.00\")", "3.14")]
    [InlineData("TEXT(42)", "42")]
    public void Functions_returning_text(string expression, string expected)
    {
        Assert.Equal(expected, Run(expression));
    }

    [Theory]
    [InlineData("LEN(\"abcd\")", 4.0)]
    [InlineData("FIND(\"c\", \"abcabc\")", 3.0)]
    [InlineData("FIND(\"c\", \"abcabc\", 4)", 6.0)]
    [InlineData("FIND(\"z\", \"abc\")", 0.0)]
    [InlineData("VALUE(\"12.5\")", 12.5)]
    public void Functions_returning_numbers(string expression, double expected)
    {
        Assert.Equal(expected, Run(expression));
    }

    [Theory]
    [InlineData("CONTAINS(\"Hello\", \"ELL\")", true)]
    [InlineData("STARTSWITH(\"Hello\", \"he\")", true)]
    [InlineData("ENDSWITH(\"Hello\", \"LO\")", true)]
    [InlineData("CONTAINS(\"Hello\", \"z\")", false)]
    public void Functions_returning_true_or_false(string expression, bool expected)
    {
        Assert.Equal(expected, Run(expression));
    }

    [Fact]
    public void VALUE_of_text_that_isnt_a_number_is_blank()
    {
        Assert.Null(Run("VALUE(\"abc\")"));
    }

    [Fact]
    public void Text_builders_refuse_absurd_sizes()
    {
        Assert.Null(Run("REPEAT(\"abc\", 100000)"));
        Assert.Null(Run("PADLEFT(\"a\", 100000)"));
    }
}
