namespace Reporting.Abstractions;

/// <summary>How the rows in one category reduce to a single value.</summary>
public enum Aggregate
{
    Sum,
    Average,
    Count,
    Min,
    Max
}
