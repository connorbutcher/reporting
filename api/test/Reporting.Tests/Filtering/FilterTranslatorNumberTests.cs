using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using static Reporting.Tests.FilterTranslatorFixture;

namespace Reporting.Tests;

public class FilterTranslatorNumberTests
{
    [Theory]
    [InlineData(FilterOperator.Equals, 5, true)]
    [InlineData(FilterOperator.Equals, 6, false)]
    [InlineData(FilterOperator.NotEquals, 6, true)]
    [InlineData(FilterOperator.NotEquals, 5, false)]
    [InlineData(FilterOperator.GreaterThan, 6, true)]
    [InlineData(FilterOperator.GreaterThan, 5, false)]
    [InlineData(FilterOperator.GreaterThanOrEqual, 5, true)]
    [InlineData(FilterOperator.LessThan, 4, true)]
    [InlineData(FilterOperator.LessThan, 5, false)]
    [InlineData(FilterOperator.LessThanOrEqual, 5, true)]
    public void Compare_against_the_operand(FilterOperator op, double cell, bool expected)
    {
        Assert.Equal(expected, Matches(Cond(QtyRef, op, "5"), Row(qty: cell)));
    }

    [Theory]
    [InlineData(1, 9, 5, true)]
    [InlineData(1, 9, 1, true)]
    [InlineData(1, 9, 9, true)]
    [InlineData(1, 9, 10, false)]
    [InlineData(9, 1, 5, true)] // bounds entered the wrong way round
    [InlineData(9, 1, 0, false)]
    public void Between_is_inclusive_and_tolerates_reversed_bounds(double from, double to, double cell, bool expected)
    {
        Assert.Equal(expected, Matches(Cond(QtyRef, FilterOperator.Between, from.ToString(), to.ToString()), Row(qty: cell)));
    }

    [Fact]
    public void A_non_numeric_operand_is_rejected_by_name()
    {
        var error = Assert.Throws<FilterException>(() => Compile(Cond(QtyRef, FilterOperator.Equals, "abc")));

        Assert.Contains("'abc' is not a number", error.Message);
        Assert.Contains("Qty", error.Message);
    }
}
