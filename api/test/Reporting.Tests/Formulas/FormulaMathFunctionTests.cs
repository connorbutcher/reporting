using static Reporting.Tests.Formulas.FormulaTestHarness;

namespace Reporting.Tests.Formulas;

/// <summary>The numeric functions. Results that aren't defined (a square root of a negative, a zero divisor) are blank, not errors.</summary>
public class FormulaMathFunctionTests
{
    [Theory]
    [InlineData("ROUND(2.5)", 3.0)]
    [InlineData("ROUND(-2.5)", -3.0)]
    [InlineData("ROUND(1.005, 2)", 1.01)]
    [InlineData("ROUND(1234, -2)", 1200.0)]
    [InlineData("ROUNDUP(1.1 * 10 / 10, 0)", 2.0)]
    [InlineData("ROUNDUP(-1.21, 1)", -1.3)]
    [InlineData("ROUNDDOWN(1.29, 1)", 1.2)]
    [InlineData("ROUNDDOWN(-1.29, 1)", -1.2)]
    [InlineData("CEILING(1.2)", 2.0)]
    [InlineData("FLOOR(-1.2)", -2.0)]
    [InlineData("ABS(-3)", 3.0)]
    [InlineData("SIGN(-9)", -1.0)]
    [InlineData("SQRT(16)", 4.0)]
    [InlineData("POWER(2, 10)", 1024.0)]
    [InlineData("MOD(10, 3)", 1.0)]
    [InlineData("MOD(-1, 3)", 2.0)]
    [InlineData("LOG(8, 2)", 3.0)]
    [InlineData("LOG(100)", 2.0)]
    [InlineData("CLAMP(150, 0, 100)", 100.0)]
    [InlineData("CLAMP(-5, 0, 100)", 0.0)]
    [InlineData("PERCENTOF(25, 200)", 12.5)]
    [InlineData("PERCENTCHANGE(50, 75)", 50.0)]
    [InlineData("DIVIDE(10, 4)", 2.5)]
    [InlineData("DIVIDE(10, 0, -1)", -1.0)]
    [InlineData("PI()", Math.PI)]
    public void Numeric_functions(string expression, double expected)
    {
        Assert.Equal(expected, (double)Run(expression)!, 9);
    }

    [Theory]
    [InlineData("MIN(3, 1, 2)", 1.0)]
    [InlineData("MAX(3, 1, 2)", 3.0)]
    [InlineData("SUM(1, 2, 3)", 6.0)]
    [InlineData("AVERAGE(1, 2, 6)", 3.0)]
    [InlineData("MEDIAN(5, 1, 3)", 3.0)]
    [InlineData("MEDIAN(4, 1, 3, 2)", 2.5)]
    public void Aggregating_functions(string expression, double expected)
    {
        Assert.Equal(expected, (double)Run(expression)!, 9);
    }

    [Theory]
    [InlineData("SQRT(-1)")]
    [InlineData("MOD(1, 0)")]
    [InlineData("LN(0)")]
    [InlineData("LOG(5, 1)")]
    [InlineData("PERCENTOF(1, 0)")]
    [InlineData("CLAMP(1, 5, 0)")]
    [InlineData("DIVIDE(1, 0)")]
    [InlineData("POWER(10, 1000)")]
    public void Undefined_math_is_blank(string expression)
    {
        Assert.Null(Run(expression));
    }

    [Fact]
    public void Aggregating_functions_ignore_blanks_and_are_blank_when_nothing_is_left()
    {
        Assert.Equal(4.0, RunNumbers("SUM([A], [B], [C])", 1.0, null, 3.0));
        Assert.Equal(2.0, RunNumbers("AVERAGE([A], [B], [C])", 1.0, null, 3.0));
        Assert.Equal(1.0, RunNumbers("MIN([A], [B], [C])", 1.0, null, 3.0));
        Assert.Null(RunNumbers("SUM([A], [B], [C])", null, null, null));
    }

    [Fact]
    public void DIVIDE_falls_back_when_the_divisor_is_blank_but_stays_blank_when_the_numerator_is()
    {
        Assert.Equal(7.0, RunNumbers("DIVIDE([A], [B], 7)", 1.0, null));
        Assert.Null(RunNumbers("DIVIDE([A], [B], 7)", null, 2.0));
    }
}
