namespace Reporting.Abstractions;

/// <summary>
/// How a pivot measure reduces a group. The first five match <see cref="Aggregate"/> name for name,
/// so measures saved before the pivot had its own list still read.
/// </summary>
public enum PivotAggregate
{
    Sum,
    Average,
    Count,
    Min,
    Max,
    /// <summary>How many different values the column holds in the group; works on any column type.</summary>
    CountDistinct,
    Median
}
