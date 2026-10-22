namespace Reporting.Abstractions;

public class FilterConditionDto : FilterNodeDto
{
    public Guid ColumnId { get; set; }
    public FilterOperator Operator { get; set; }

    /// <summary>Parsed against the column's type; 0, 1 or 2 depending on the operator.</summary>
    public List<string> Values { get; set; } = new();

    /// <summary>Defaults to true so conditions saved before toggling existed still apply.</summary>
    public bool Enabled { get; set; } = true;
}
