namespace Reporting.Abstractions;

public class ReorderColumnsDto
{
    public List<Guid> ColumnIds { get; set; } = new();
}
