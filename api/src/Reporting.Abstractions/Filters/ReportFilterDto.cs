namespace Reporting.Abstractions;

/// <summary>Applies to every widget bound to <see cref="DatasetId"/>, AND-ed with the widget's own filter.</summary>
public class ReportFilterDto
{
    public int DatasetId { get; set; }
    public FilterGroupDto Filter { get; set; } = new();
}
