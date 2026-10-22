using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.Database;
using static Reporting.Tests.FilterTranslatorFixture;

namespace Reporting.Tests;

public class FilterTranslatorBooleanTests
{
    [Fact]
    public void True_and_false_match_the_cell()
    {
        Assert.True(Matches(Cond(OkRef, FilterOperator.IsTrue), Row(ok: true)));
        Assert.False(Matches(Cond(OkRef, FilterOperator.IsTrue), Row(ok: false)));
        Assert.True(Matches(Cond(OkRef, FilterOperator.IsFalse), Row(ok: false)));
        Assert.False(Matches(Cond(OkRef, FilterOperator.IsFalse), Row()));
    }
}
