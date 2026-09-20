using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.Database;
using Xunit;

namespace Reporting.Tests;

/// <summary>
/// A condition on a column the dataset lacks is rejected outright, failing the whole filter. The
/// viewer leaves such conditions out of its queries because of this.
/// </summary>
public class FilterUnknownColumnTests
{
    private static readonly Guid KnownColumn = Guid.NewGuid();
    private static readonly Guid RemovedColumn = Guid.NewGuid();

    private static IReadOnlyDictionary<Guid, DatasetColumn> Columns() => new Dictionary<Guid, DatasetColumn>
    {
        [KnownColumn] = new DatasetColumn { Id = 1, RefId = KnownColumn, Name = "Name", Type = DatasetColumnType.String }
    };

    private static FilterConditionDto Equals(Guid column, bool enabled = true) => new()
    {
        ColumnId = column,
        Operator = FilterOperator.Equals,
        Values = ["a"],
        Enabled = enabled
    };

    [Fact]
    public void An_enabled_condition_on_a_column_the_dataset_lacks_is_rejected()
    {
        var group = new FilterGroupDto { Children = { Equals(RemovedColumn) } };

        var error = Assert.Throws<FilterException>(() => FilterTranslator.Build(group, Columns()));

        Assert.Contains("not part of this dataset", error.Message);
    }

    [Fact]
    public void One_stale_condition_fails_the_whole_filter_not_just_itself()
    {
        var group = new FilterGroupDto { Children = { Equals(KnownColumn), Equals(RemovedColumn) } };

        Assert.Throws<FilterException>(() => FilterTranslator.Build(group, Columns()));
    }

    [Fact]
    public void A_disabled_condition_on_a_missing_column_is_never_looked_at()
    {
        var group = new FilterGroupDto { Children = { Equals(RemovedColumn, enabled: false) } };

        Assert.Null(FilterTranslator.Build(group, Columns()));
    }
}
