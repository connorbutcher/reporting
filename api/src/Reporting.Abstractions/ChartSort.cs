namespace Reporting.Abstractions;

/// <summary>What a chart's own order falls back to when nothing overrides it: a bar/combo/box
/// plot's category order, or a point chart's X order.</summary>
public enum ChartSortBy
{
    Default,
    Column
}

/// <summary>
/// How several rows in one category collapse to the single number a sort ranks it by. Ignored
/// by a point chart's per-row sort, which has nothing to reduce — each row is its own point.
/// </summary>
public enum SortAggregate
{
    Sum,
    Average,
    Count,
    Min,
    Max,
    Median,

    /// <summary>The interquartile range (Q3 − Q1) — a dispersion metric, e.g. "widest spread first".</summary>
    Spread
}

/// <summary>
/// How a chart orders its categories (bar, combo, box plot) or its points (scatter, line).
/// <see cref="ChartSortBy.Default"/> keeps the chart's own natural order — the category column's
/// own order, or X ascending. <see cref="ChartSortBy.Column"/> ranks by any column in the dataset,
/// not necessarily one plotted on the chart, reduced per category by <see cref="Aggregate"/>
/// (ignored for a point chart, whose rows aren't grouped).
/// </summary>
public class ChartSort
{
    public ChartSortBy By { get; set; } = ChartSortBy.Default;

    /// <summary>The column to rank by; required (and resolved against the query's own dataset) when <see cref="By"/> is Column.</summary>
    public Guid? ColumnId { get; set; }

    public SortAggregate Aggregate { get; set; } = SortAggregate.Sum;

    public bool Descending { get; set; }

    /// <summary>
    /// Keeps only the first N categories in this order (bar and combination charts); null keeps
    /// every category. Ignored by the other chart kinds.
    /// </summary>
    public int? Limit { get; set; }

    /// <summary>With <see cref="Limit"/>, rolls the categories past the limit into one "Other" category.</summary>
    public bool ShowOther { get; set; }
}
