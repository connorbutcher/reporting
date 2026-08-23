namespace Reporting.Abstractions;

public class FilterOperatorDto
{
    public FilterOperator Value { get; set; }
    public string Label { get; set; } = string.Empty;
    public int OperandCount { get; set; }
    public FilterOperandKind OperandKind { get; set; }
}

public class FilterOperatorsForTypeDto
{
    public DatasetColumnType Type { get; set; }
    public List<FilterOperatorDto> Operators { get; set; } = new();
}
