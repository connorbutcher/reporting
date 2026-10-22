namespace Reporting.Abstractions;

/// <summary>One measure a pivot computes: an aggregate over a column, reduced within each group.</summary>
public class PivotMeasureDto
{
    /// <summary>The column reduced; null (and ignored) for <see cref="PivotAggregate.Count"/>, which counts rows.</summary>
    public Guid? ColumnId { get; set; }

    public PivotAggregate Aggregate { get; set; } = PivotAggregate.Sum;

    public PivotShowAs ShowAs { get; set; } = PivotShowAs.Value;

    /// <summary>Overrides the derived column header (e.g. "Sum of Cost"); blank uses the derived one.</summary>
    public string Label { get; set; } = string.Empty;
}
