using static Reporting.Tests.Formulas.FormulaTestHarness;

namespace Reporting.Tests.Formulas;

/// <summary>Formula text that can't be read is reported with a message, and where in the text it went wrong.</summary>
public class FormulaSyntaxErrorTests
{
    [Theory]
    [InlineData("1 +", "ends unexpectedly")]
    [InlineData("(1 + 2", "Missing closing")]
    [InlineData("1 < 2 < 3", "can't be chained")]
    [InlineData("\"abc", "closing quote")]
    [InlineData("[Price", "closing ']'")]
    [InlineData("Price + 1", "square brackets")]
    [InlineData("1 $ 2", "Unexpected character")]
    [InlineData("", "Enter a formula")]
    [InlineData("ROUND(1,)", "Unexpected")]
    public void Syntax_errors_are_reported_with_a_message(string expression, string expectedFragment)
    {
        var analysis = Check(expression);

        Assert.False(analysis.IsValid);
        Assert.Contains(expectedFragment, analysis.ErrorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void A_syntax_error_says_where_it_is()
    {
        var error = Check("1 + $").Errors.Single();

        Assert.Equal(4, error.Position);
        Assert.Equal(1, error.Length);
    }

    [Fact]
    public void A_number_with_a_stray_exponent_letter_is_a_number_then_an_error()
    {
        var analysis = Check("2e");

        Assert.False(analysis.IsValid);
    }
}
