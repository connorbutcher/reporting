using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.Database;
using static Reporting.Tests.FilterTranslatorFixture;

namespace Reporting.Tests;

public class FilterTranslatorTreeTests
{
    [Fact]
    public void No_filter_builds_no_predicate_and_leaves_rows_untouched()
    {
        var rows = new List<DatasetRow> { Row("a") }.AsQueryable();

        Assert.Null(FilterTranslator.Build(null, Columns()));
        Assert.Same(rows, FilterTranslator.Apply(rows, null, Columns()));
    }

    [Fact]
    public void An_empty_group_filters_nothing_rather_than_matching_nothing()
    {
        Assert.Null(FilterTranslator.Build(And(), Columns()));
        Assert.Null(FilterTranslator.Build(And(Or(), And()), Columns()));
    }

    [Fact]
    public void And_needs_every_condition_and_or_needs_any()
    {
        var both = Row(qty: 5, ok: true);
        var one = Row(qty: 5, ok: false);

        var all = And(Cond(QtyRef, FilterOperator.Equals, "5"), Cond(OkRef, FilterOperator.IsTrue));
        var any = Or(Cond(QtyRef, FilterOperator.Equals, "5"), Cond(OkRef, FilterOperator.IsTrue));

        Assert.True(Matches(all, both));
        Assert.False(Matches(all, one));
        Assert.True(Matches(any, one));
        Assert.False(Matches(any, Row(qty: 6, ok: false)));
    }

    [Fact]
    public void Groups_nest()
    {
        var filter = And(
            Cond(OkRef, FilterOperator.IsTrue),
            Or(Cond(QtyRef, FilterOperator.Equals, "1"), Cond(QtyRef, FilterOperator.Equals, "2")));

        Assert.True(Matches(filter, Row(qty: 2, ok: true)));
        Assert.False(Matches(filter, Row(qty: 3, ok: true)));
        Assert.False(Matches(filter, Row(qty: 2, ok: false)));
    }

    [Fact]
    public void A_disabled_condition_never_narrows_even_in_an_or()
    {
        var off = Cond(QtyRef, FilterOperator.Equals, "1");
        off.Enabled = false;

        var filter = Or(off, Cond(QtyRef, FilterOperator.Equals, "2"));

        Assert.False(Matches(filter, Row(qty: 1)));
        Assert.True(Matches(filter, Row(qty: 2)));
    }
}
