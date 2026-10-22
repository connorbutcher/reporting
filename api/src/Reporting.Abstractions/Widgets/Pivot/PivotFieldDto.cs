namespace Reporting.Abstractions;

/// <summary>A dimension column in the result header, so the client can label the grouped columns.</summary>
public class PivotFieldDto
{
    public Guid ColumnId { get; set; }
    public string Label { get; set; } = string.Empty;
}
