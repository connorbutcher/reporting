namespace Reporting.Abstractions;

/// <summary><see cref="ColumnId"/> may be null for <see cref="PivotAggregate.Count"/>.</summary>
public class PivotMeasureConfig
{
    /// <summary>Client-generated editor id.</summary>
    public string Id { get; set; } = string.Empty;

    public Guid? ColumnId { get; set; }

    public PivotAggregate Aggregate { get; set; } = PivotAggregate.Sum;

    public PivotShowAs ShowAs { get; set; } = PivotShowAs.Value;

    /// <summary>Blank uses the derived header, e.g. "Sum of Cost".</summary>
    public string Label { get; set; } = string.Empty;

    public bool DataBars { get; set; }

    /// <summary>The first matching rule wins.</summary>
    public List<FormatRule> FormatRules { get; set; } = new();
}
