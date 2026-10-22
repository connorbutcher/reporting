using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using static Reporting.Tests.FilterTranslatorFixture;

namespace Reporting.Tests;

public class FilterTranslatorDateTests
{
    private static readonly DateTime Day = new(2026, 3, 4);

    [Fact]
    public void Equals_means_the_whole_of_that_day_and_not_equals_the_rest()
    {
        var equals = Cond(WhenRef, FilterOperator.Equals, "2026-03-04");
        var notEquals = Cond(WhenRef, FilterOperator.NotEquals, "2026-03-04");

        Assert.True(Matches(equals, Row(when: Day.AddHours(15))));
        Assert.False(Matches(equals, Row(when: Day.AddDays(1))));
        Assert.False(Matches(notEquals, Row(when: Day.AddHours(15))));
        Assert.True(Matches(notEquals, Row(when: Day.AddDays(-1))));
    }

    [Fact]
    public void Before_and_after_compare_instants()
    {
        Assert.True(Matches(Cond(WhenRef, FilterOperator.GreaterThan, "2026-03-04"), Row(when: Day.AddDays(1))));
        Assert.False(Matches(Cond(WhenRef, FilterOperator.GreaterThan, "2026-03-04"), Row(when: Day)));
        Assert.True(Matches(Cond(WhenRef, FilterOperator.GreaterThanOrEqual, "2026-03-04"), Row(when: Day)));
        Assert.True(Matches(Cond(WhenRef, FilterOperator.LessThan, "2026-03-04"), Row(when: Day.AddTicks(-1))));
        Assert.True(Matches(Cond(WhenRef, FilterOperator.LessThanOrEqual, "2026-03-04"), Row(when: Day)));
    }

    [Fact]
    public void Between_includes_the_whole_of_the_upper_day_and_tolerates_reversed_bounds()
    {
        var forward = Cond(WhenRef, FilterOperator.Between, "2026-03-01", "2026-03-03");
        var reversed = Cond(WhenRef, FilterOperator.Between, "2026-03-03", "2026-03-01");
        var inside = Row(when: new DateTime(2026, 3, 3, 23, 30, 0));
        var outside = Row(when: new DateTime(2026, 3, 4));

        Assert.True(Matches(forward, inside));
        Assert.False(Matches(forward, outside));
        Assert.True(Matches(reversed, inside));
        Assert.False(Matches(reversed, Row(when: new DateTime(2026, 2, 28, 23, 59, 0))));
    }

    [Fact]
    public void In_the_last_and_next_days_are_relative_to_today()
    {
        var today = DateTime.UtcNow.Date;
        var last = Cond(WhenRef, FilterOperator.InLastDays, "3");
        var next = Cond(WhenRef, FilterOperator.InNextDays, "3");

        Assert.True(Matches(last, Row(when: today.AddDays(-2))));
        Assert.True(Matches(last, Row(when: today.AddDays(-3))));
        Assert.False(Matches(last, Row(when: today.AddDays(-4))));
        Assert.False(Matches(last, Row(when: today.AddDays(1))));
        Assert.True(Matches(next, Row(when: today.AddDays(3))));
        Assert.False(Matches(next, Row(when: today.AddDays(4))));
        Assert.False(Matches(next, Row(when: today.AddDays(-1))));
    }

    [Fact]
    public void A_non_date_operand_is_rejected_by_name()
    {
        var error = Assert.Throws<FilterException>(() => Compile(Cond(WhenRef, FilterOperator.Equals, "soon")));

        Assert.Contains("'soon' is not a date", error.Message);
    }
}
