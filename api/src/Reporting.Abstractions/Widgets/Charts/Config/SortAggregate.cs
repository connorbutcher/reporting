namespace Reporting.Abstractions;

/// <summary>How a category's rows reduce to the number a sort ranks it by.</summary>
public enum SortAggregate
{
    Sum,
    Average,
    Count,
    Min,
    Max,
    Median,

    /// <summary>The interquartile range (Q3 − Q1).</summary>
    Spread
}
