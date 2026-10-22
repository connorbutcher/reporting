namespace Reporting.Abstractions;

/// <summary>Groups a date row or column field by period.</summary>
public class PivotFieldGroupingDto
{
    public Guid ColumnId { get; set; }
    public DateGrouping Grouping { get; set; } = DateGrouping.Month;
}
