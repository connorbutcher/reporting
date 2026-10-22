namespace Reporting.Abstractions;

/// <summary>The serialized shape of a <see cref="ChartSort"/>, separate so <see cref="ChartSortJsonConverter"/> doesn't recurse.</summary>
internal sealed class ChartSortShape
{
    public ChartSortBy By { get; set; } = ChartSortBy.Default;
    public Guid? ColumnId { get; set; }
    public SortAggregate Aggregate { get; set; } = SortAggregate.Sum;
    public bool Descending { get; set; }
    public int? Limit { get; set; }
    public bool ShowOther { get; set; }
}
