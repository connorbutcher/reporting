namespace Reporting.Abstractions;

public class CreateReportDto
{
    public string Name { get; set; } = string.Empty;
    public int? FolderId { get; set; }
    /// <summary>When set, the new report's draft is pre-populated with this report's current content.</summary>
    public int? SourceReportId { get; set; }
}
