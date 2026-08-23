namespace Reporting.Abstractions;

public class CreateReportDto
{
    public string Name { get; set; } = string.Empty;
    public int? FolderId { get; set; }
    /// <summary>When set, the new report's draft is pre-populated with this report's current content.</summary>
    public int? SourceReportId { get; set; }
}

public class SaveReportDto
{
    public string Name { get; set; } = string.Empty;
    public int? FolderId { get; set; }
}

public class CheckoutDraftDto
{
    public int? FromVersionNumber { get; set; }
}

public class PublishDraftDto
{
    /// <summary>Rich-text (HTML) description of what changed, from the publish dialog's editor.</summary>
    public string? Notes { get; set; }
}
