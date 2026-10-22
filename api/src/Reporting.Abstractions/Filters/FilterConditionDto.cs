namespace Reporting.Abstractions;

public class FilterConditionDto : FilterNodeDto
{
    public Guid ColumnId { get; set; }
    public FilterOperator Operator { get; set; }

    /// <summary>Raw strings parsed against the column's type; 0, 1 or 2 depending on the operator.</summary>
    public List<string> Values { get; set; } = new();

    /// <summary>Defaults to true, so conditions stored before toggling existed still apply. A disabled one is kept but skipped when translated.</summary>
    public bool Enabled { get; set; } = true;
}
