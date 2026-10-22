namespace Reporting.Abstractions;

public class FilterOperatorsForTypeDto
{
    public DatasetColumnType Type { get; set; }
    public List<FilterOperatorDto> Operators { get; set; } = new();
}
