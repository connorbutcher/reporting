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
    [InlineData("MINUTE([D])", 30.0)]
    [InlineData("SECOND(DATEADD(\"second\", 5, [D]))", 5.0)]
    [InlineData("DAYOFYEAR([D])", 74.0)]
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
    public void Dates_moved_to_the_start_of_their_week_quarter_and_year()
    {
        Assert.Equal(new DateTime(2026, 3, 9), RunOnSample("STARTOFWEEK([D])")); // the sample is a Sunday
        Assert.Equal(new DateTime(2026, 3, 9), Run("STARTOFWEEK(DATE(2026, 3, 9))"));
        Assert.Equal(new DateTime(2026, 1, 1), RunOnSample("STARTOFQUARTER([D])"));
        Assert.Equal(new DateTime(2026, 10, 1), Run("STARTOFQUARTER(DATE(2026, 12, 31))"));
        Assert.Equal(new DateTime(2026, 1, 1), RunOnSample("STARTOFYEAR([D])"));
    }

    [Theory]
    [InlineData("NETWORKDAYS(DATE(2026, 3, 9), DATE(2026, 3, 20))", 10.0)] // Monday to the next week's Friday
    [InlineData("NETWORKDAYS(DATE(2026, 3, 20), DATE(2026, 3, 9))", -10.0)]
    [InlineData("NETWORKDAYS(DATE(2026, 3, 9), DATE(2026, 3, 9))", 1.0)]
    [InlineData("NETWORKDAYS(DATE(2026, 3, 14), DATE(2026, 3, 15))", 0.0)] // a weekend
    [InlineData("NETWORKDAYS(DATE(2026, 3, 13), DATE(2026, 3, 16))", 2.0)] // Friday to Monday
    [InlineData("NETWORKDAYS(DATE(2026, 1, 1), DATE(2026, 12, 31))", 261.0)]
    public void NETWORKDAYS_counts_weekdays_including_both_ends(string expression, double expected)
    {
        Assert.Equal(expected, Run(expression));
    }

    [Theory]
    [InlineData("WORKDAY(DATE(2026, 3, 13), 1)", 2026, 3, 16)] // Friday to Monday
    [InlineData("WORKDAY(DATE(2026, 3, 13), 10)", 2026, 3, 27)]
    [InlineData("WORKDAY(DATE(2026, 3, 16), -1)", 2026, 3, 13)]
    [InlineData("WORKDAY(DATE(2026, 3, 15), 1)", 2026, 3, 16)] // from a Sunday
    [InlineData("WORKDAY(DATE(2026, 3, 14), 5)", 2026, 3, 20)] // from a Saturday
    [InlineData("WORKDAY(DATE(2026, 3, 14), -1)", 2026, 3, 13)]
    [InlineData("WORKDAY(DATE(2026, 3, 15), 0)", 2026, 3, 15)]
    public void WORKDAY_steps_over_weekends(string expression, int year, int month, int day)
    {
        Assert.Equal(new DateTime(year, month, day), Run(expression));
    }

    [Fact]
    public void WORKDAY_drops_the_time_and_is_blank_past_the_end_of_the_calendar()
    {
        Assert.Equal(new DateTime(2026, 3, 16), RunOnSample("WORKDAY([D], 1)"));
        Assert.Null(RunOnSample("WORKDAY([D], 10000000)"));
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
