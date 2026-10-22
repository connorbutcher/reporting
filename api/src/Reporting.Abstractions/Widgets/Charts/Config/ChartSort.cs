namespace Reporting.Abstractions;

/// <summary>
/// Orders a chart's categories or points. <see cref="ChartSortBy.Column"/> ranks by any dataset column,
/// reduced per category by <see cref="Aggregate"/>.
/// </summary>
public class ChartSort
{
    public ChartSortBy By { get; set; } = ChartSortBy.Default;

    /// <summary>Required when <see cref="By"/> is Column.</summary>
    public Guid? ColumnId { get; set; }

    public SortAggregate Aggregate { get; set; } = SortAggregate.Sum;

    public bool Descending { get; set; }

    /// <summary>Bar and combination charts: keeps only the first N categories; null keeps all.</summary>
    public int? Limit { get; set; }

    /// <summary>With <see cref="Limit"/>, rolls the rest into one "Other" category.</summary>
    public bool ShowOther { get; set; }
}
