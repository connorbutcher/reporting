namespace Reporting.Abstractions;

/// <summary>A measure column in the result header — its resolved label and which measure it came from.</summary>
public class PivotMeasureColumnDto
{
    /// <summary>Stable per-result key ("m0", "m1", …) naming the measure's position in the request.</summary>
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public Guid? ColumnId { get; set; }
    public PivotAggregate Aggregate { get; set; }
    public PivotShowAs ShowAs { get; set; }
}
