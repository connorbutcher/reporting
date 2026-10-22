namespace Reporting.Abstractions;

/// <summary>How a bar chart reduces the many rows in one category down to a single bar height.</summary>
public enum Aggregate
{
    Sum,
    Average,
    Count,
    Min,
    Max
}
