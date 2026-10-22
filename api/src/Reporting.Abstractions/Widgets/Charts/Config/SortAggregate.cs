namespace Reporting.Abstractions;

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
