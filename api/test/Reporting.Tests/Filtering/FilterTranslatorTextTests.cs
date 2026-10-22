using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.Database;
using static Reporting.Tests.FilterTranslatorFixture;

namespace Reporting.Tests;

public class FilterTranslatorTextTests
{
    [Fact]
    public void Equals_and_not_equals_compare_the_whole_value()
    {
        Assert.True(Matches(Cond(NameRef, FilterOperator.Equals, "Day"), Row("Day")));
        Assert.False(Matches(Cond(NameRef, FilterOperator.Equals, "Day"), Row("Days")));
        Assert.True(Matches(Cond(NameRef, FilterOperator.NotEquals, "Day"), Row("Night")));
        Assert.True(Matches(Cond(NameRef, FilterOperator.NotEquals, "Day"), Row()));
        Assert.False(Matches(Cond(NameRef, FilterOperator.NotEquals, "Day"), Row("Day")));
    }

    [Theory]
    [InlineData("Day,Night", "Night", true)]
    [InlineData("Day, Night ,", "Night", true)] // trimmed, blanks dropped
    [InlineData("Day,Night", "Twilight", false)]
    public void In_accepts_one_comma_separated_operand(string list, string cell, bool expected)
    {
        Assert.Equal(expected, Matches(Cond(NameRef, FilterOperator.In, list), Row(cell)));
    }

    [Fact]
    public void In_accepts_several_operands()
    {
        var filter = Cond(NameRef, FilterOperator.In, "Day", "Night");

        Assert.True(Matches(filter, Row("Night")));
        Assert.False(Matches(filter, Row("Twilight")));
    }

    [Fact]
    public void In_needs_at_least_one_value()
    {
        var error = Assert.Throws<FilterException>(() => Compile(Cond(NameRef, FilterOperator.In, " , ")));

        Assert.Contains("at least one value", error.Message);
    }
}
