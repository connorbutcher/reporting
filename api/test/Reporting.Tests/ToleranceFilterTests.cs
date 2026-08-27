using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.DAL.Widgets;
using Reporting.Database;
using Xunit;

namespace Reporting.Tests;

public class ToleranceFilterTests
{
    private static readonly Guid ColumnRef = Guid.NewGuid();

    // In-spec [10, 20]; amber shoulders [8, 10) and (20, 22]; out of tolerance below 8 or above 22.
    private static readonly ToleranceBounds Bounds = new(Min: 10, Max: 20, ConcessionLower: 8, ConcessionUpper: 22);

    private static IReadOnlyDictionary<Guid, DatasetColumn> Columns() => new Dictionary<Guid, DatasetColumn>
    {
        [ColumnRef] = new DatasetColumn { Id = 1, RefId = ColumnRef, Name = "Bore", Type = DatasetColumnType.Double }
    };

    private static DatasetRow Row(double value) =>
        new() { Cells = { new DatasetCell { ColumnId = 1, NumberValue = value } } };

    private static FilterGroupDto Group(FilterOperator op) => new()
    {
        Children = { new FilterConditionDto { ColumnId = ColumnRef, Operator = op } }
    };

    private static Func<DatasetRow, bool> Predicate(FilterOperator op, ToleranceBounds? bounds)
    {
        var map = new Dictionary<Guid, ToleranceBounds?> { [ColumnRef] = bounds };
        return FilterTranslator.Build(Group(op), Columns(), map)!.Compile();
    }

    [Theory]
    [InlineData(15, true)]
    [InlineData(10, true)]  // inclusive lower spec bound
    [InlineData(20, true)]  // inclusive upper spec bound
    [InlineData(9, false)]  // in the concession band, not in spec
    [InlineData(21, false)]
    [InlineData(7, false)]
    public void In_tolerance_matches_only_the_in_spec_range(double value, bool expected)
    {
        Assert.Equal(expected, Predicate(FilterOperator.InTolerance, Bounds)(Row(value)));
    }

    [Theory]
    [InlineData(9, true)]   // amber below spec
    [InlineData(21, true)]  // amber above spec
    [InlineData(8, true)]   // inclusive concession bound
    [InlineData(22, true)]
    [InlineData(15, false)] // in spec
    [InlineData(7, false)]  // out of tolerance
    [InlineData(23, false)]
    public void Needs_concession_matches_only_the_amber_shoulders(double value, bool expected)
    {
        Assert.Equal(expected, Predicate(FilterOperator.NeedsConcession, Bounds)(Row(value)));
    }

    [Theory]
    [InlineData(7, true)]   // below the concession bound
    [InlineData(23, true)]  // above the concession bound
    [InlineData(9, false)]  // amber, still within concession
    [InlineData(15, false)] // in spec
    public void Out_of_tolerance_matches_beyond_the_widest_bound(double value, bool expected)
    {
        Assert.Equal(expected, Predicate(FilterOperator.OutOfTolerance, Bounds)(Row(value)));
    }

    [Fact]
    public void Out_of_tolerance_falls_back_to_spec_bounds_without_concession()
    {
        var noConcession = new ToleranceBounds(10, 20, ConcessionLower: null, ConcessionUpper: null);
        var predicate = Predicate(FilterOperator.OutOfTolerance, noConcession);

        Assert.True(predicate(Row(9)));   // no amber band, so just outside spec is out of tolerance
        Assert.True(predicate(Row(21)));
        Assert.False(predicate(Row(15)));
    }

    [Fact]
    public void Needs_concession_matches_nothing_without_a_concession_band()
    {
        var noConcession = new ToleranceBounds(10, 20, ConcessionLower: null, ConcessionUpper: null);
        var predicate = Predicate(FilterOperator.NeedsConcession, noConcession);

        Assert.False(predicate(Row(9)));
        Assert.False(predicate(Row(15)));
    }

    [Fact]
    public void Unresolved_bounds_make_the_condition_a_no_op()
    {
        // No banding for the column (null bounds) — the whole filter is null, so nothing is narrowed.
        var predicate = FilterTranslator.Build(Group(FilterOperator.OutOfTolerance), Columns(),
            new Dictionary<Guid, ToleranceBounds?> { [ColumnRef] = null });

        Assert.Null(predicate);
    }

    [Fact]
    public void Tolerance_on_a_non_numeric_column_is_rejected()
    {
        var columns = new Dictionary<Guid, DatasetColumn>
        {
            [ColumnRef] = new DatasetColumn { Id = 1, RefId = ColumnRef, Name = "Name", Type = DatasetColumnType.String }
        };
        var map = new Dictionary<Guid, ToleranceBounds?> { [ColumnRef] = Bounds };

        Assert.Throws<FilterException>(() =>
            FilterTranslator.Build(Group(FilterOperator.OutOfTolerance), columns, map));
    }
}
