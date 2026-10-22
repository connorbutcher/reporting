namespace Reporting.Abstractions;

public class PivotFieldDto
{
    public Guid ColumnId { get; set; }
    public string Label { get; set; } = string.Empty;
}
