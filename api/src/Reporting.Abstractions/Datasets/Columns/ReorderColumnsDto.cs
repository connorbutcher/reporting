namespace Reporting.Abstractions;

/// <summary>The new left-to-right order, given as column ids.</summary>
public class ReorderColumnsDto
{
    public List<Guid> ColumnIds { get; set; } = new();
}
