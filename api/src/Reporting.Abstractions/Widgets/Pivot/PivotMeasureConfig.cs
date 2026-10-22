namespace Reporting.Abstractions;

/// <summary>
/// One measure a pivot table computes and shows as a value column: an aggregate over a column,
/// reduced within each group. <see cref="ColumnId"/> is unused (and may be null) for
/// <see cref="PivotAggregate.Count"/>, which counts rows.
/// </summary>
public class PivotMeasureConfig
{
    /// <summary>Client-generated, addresses this measure in the editor — not meaningful server-side.</summary>
    public string Id { get; set; } = string.Empty;

    public Guid? ColumnId { get; set; }

    public PivotAggregate Aggregate { get; set; } = PivotAggregate.Sum;

    public PivotShowAs ShowAs { get; set; } = PivotShowAs.Value;

    /// <summary>Overrides the derived column header (e.g. "Sum of Cost"); blank uses the derived one.</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>Draws a bar behind each value, scaled across the measure's values in the pivot.</summary>
    public bool DataBars { get; set; }

    /// <summary>Conditional highlighting, evaluated in order; the first rule a value matches wins.</summary>
    public List<FormatRule> FormatRules { get; set; } = new();
}
