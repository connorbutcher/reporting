namespace Reporting.Abstractions;

/// <summary>Every use of one column.</summary>
public class ColumnUsageDto
{
    public Guid ColumnId { get; set; }
    public List<ColumnUseDto> Uses { get; set; } = new();
}
