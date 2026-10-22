namespace Reporting.Abstractions;

/// <summary>The content of one revision (draft or a specific published version) of a report.</summary>
public class ReportRevisionDto
{
    public int ReportId { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>The revision's tabs, ordered; each carries its own grid and widgets.</summary>
    public List<TabDto> Tabs { get; set; } = new();

    /// <summary>Rich-text (HTML) description of what changed. Null for drafts and unpublished content.</summary>
    public string? Notes { get; set; }

    /// <summary>Report-level filters, one per dataset, applied on top of each widget's own.</summary>
    public List<ReportFilterDto> Filters { get; set; } = new();
}
