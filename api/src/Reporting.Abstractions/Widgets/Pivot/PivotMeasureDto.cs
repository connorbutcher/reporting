namespace Reporting.Abstractions;

public class PivotMeasureDto
{
    /// <summary>Ignored for <see cref="PivotAggregate.Count"/>.</summary>
    public Guid? ColumnId { get; set; }

    public PivotAggregate Aggregate { get; set; } = PivotAggregate.Sum;

    public PivotShowAs ShowAs { get; set; } = PivotShowAs.Value;

    /// <summary>Blank uses the derived header, e.g. "Sum of Cost".</summary>
    public string Label { get; set; } = string.Empty;
}
