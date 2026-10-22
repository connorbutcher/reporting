namespace Reporting.Abstractions;

/// <summary>A draft or a published version of a report.</summary>
public class ReportRevisionDto
{
    public int ReportId { get; set; }
    public string Name { get; set; } = string.Empty;

    public List<TabDto> Tabs { get; set; } = new();

    /// <summary>HTML; null for drafts.</summary>
    public string? Notes { get; set; }

    /// <summary>One per dataset, applied on top of each widget's own.</summary>
    public List<ReportFilterDto> Filters { get; set; } = new();
}
