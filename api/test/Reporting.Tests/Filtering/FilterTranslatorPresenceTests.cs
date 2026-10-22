using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.Database;
using static Reporting.Tests.FilterTranslatorFixture;

namespace Reporting.Tests;

public class FilterTranslatorPresenceTests
{
    [Fact]
    public void Empty_means_no_cell_or_a_blank_one()
    {
        var empty = Cond(NameRef, FilterOperator.IsEmpty);
        var notEmpty = Cond(NameRef, FilterOperator.IsNotEmpty);

        Assert.True(Matches(empty, Row()));
        Assert.True(Matches(empty, Row("")));
        Assert.False(Matches(empty, Row("x")));
        Assert.True(Matches(notEmpty, Row("x")));
        Assert.False(Matches(notEmpty, Row("")));
    }
}
