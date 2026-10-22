namespace Reporting.Abstractions;

public class ColumnUsageDto
{
    public Guid ColumnId { get; set; }
    public List<ColumnUseDto> Uses { get; set; } = new();
}
