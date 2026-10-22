namespace Reporting.Abstractions;

/// <summary>The first five match <see cref="Aggregate"/> by name so older measures still read.</summary>
public enum PivotAggregate
{
    Sum,
    Average,
    Count,
    Min,
    Max,
    /// <summary>Works on any column type.</summary>
    CountDistinct,
    Median
}
