namespace Reporting.Abstractions;

public class PivotFieldGroupingDto
{
    public Guid ColumnId { get; set; }
    public DateGrouping Grouping { get; set; } = DateGrouping.Month;
}
