using Reporting.DAL.Formulas.Evaluation;
using static Reporting.Tests.Formulas.FormulaTestHarness;

namespace Reporting.Tests.Formulas;

/// <summary>The date functions. DATEADD and DATEDIFF share one unit vocabulary: year, month, week, day, hour, minute, second.</summary>
public class FormulaDateFunctionTests
{
    private static readonly DateTime SampleDate = new(2026, 3, 15, 14, 30, 0);

    private static object? RunOnSample(string expression)
    {
        return Run(expression, new FormulaTestInput("D", SampleDate));
    }

    [Theory]
    [InlineData("YEAR([D])", 2026.0)]
    [InlineData("MONTH([D])", 3.0)]
    [InlineData("DAY([D])", 15.0)]
    [InlineData("HOUR([D])", 14.0)]
    [InlineData("QUARTER([D])", 1.0)]
    [InlineData("WEEKDAY([D])", 1.0)] // a Sunday
    [InlineData("ISOWEEK([D])", 11.0)]
    public void Parts_of_a_date(string expression, double expected)
    {
        Assert.Equal(expected, RunOnSample(expression));
    }

    [Fact]
    public void Dates_built_and_moved_around_a_month()
    {
        Assert.Equal(new DateTime(2026, 3, 1), RunOnSample("STARTOFMONTH([D])"));
        Assert.Equal(new DateTime(2026, 3, 31), RunOnSample("ENDOFMONTH([D])"));
        Assert.Equal(new DateTime(2026, 2, 28), Run("DATE(2026, 2, 28)"));
        Assert.Null(Run("DATE(2026, 2, 30)"));
    }

    [Fact]
    public void DATEADD_adds_units_and_accepts_them_in_the_plural()
    {
        Assert.Equal(new DateTime(2026, 3, 25, 14, 30, 0), RunOnSample("DATEADD(\"day\", 10, [D])"));
        Assert.Equal(new DateTime(2026, 5, 15, 14, 30, 0), RunOnSample("DATEADD(\"months\", 2, [D])"));
        Assert.Equal(new DateTime(2025, 3, 15, 14, 30, 0), RunOnSample("DATEADD(\"year\", -1, [D])"));
    }

    [Fact]
    public void DATEADD_past_the_end_of_the_calendar_is_blank()
    {
        Assert.Null(RunOnSample("DATEADD(\"year\", 9000, [D])"));
    }

    [Fact]
    public void DATEDIFF_counts_whole_units_and_is_signed()
    {
        var january = new FormulaTestInput("A", new DateTime(2026, 1, 31));
        var march = new FormulaTestInput("B", new DateTime(2026, 3, 15));

        Assert.Equal(43.0, Run("DATEDIFF(\"day\", [A], [B])", january, march));
        Assert.Equal(6.0, Run("DATEDIFF(\"week\", [A], [B])", january, march));
        Assert.Equal(1.0, Run("DATEDIFF(\"month\", [A], [B])", january, march));
        Assert.Equal(0.0, Run("DATEDIFF(\"year\", [A], [B])", january, march));
        Assert.Equal(-43.0, Run("DATEDIFF(\"day\", [B], [A])", january, march));
        Assert.Equal(24.0, Run("DATEDIFF(\"hour\", [A], DATEADD(\"day\", 1, [A]))", january));
    }

    [Fact]
    public void An_unknown_date_unit_fails_that_row_with_a_message()
    {
        var ex = Assert.Throws<FormulaEvaluationException>(() => RunOnSample("DATEADD(\"fortnight\", 1, [D])"));

        Assert.Contains("fortnight", ex.Message);
    }
}
