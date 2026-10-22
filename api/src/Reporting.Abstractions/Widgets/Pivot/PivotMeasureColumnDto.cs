namespace Reporting.Abstractions;

public class PivotMeasureColumnDto
{
    /// <summary>"m0", "m1", … by position in the request.</summary>
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public Guid? ColumnId { get; set; }
    public PivotAggregate Aggregate { get; set; }
    public PivotShowAs ShowAs { get; set; }
}
