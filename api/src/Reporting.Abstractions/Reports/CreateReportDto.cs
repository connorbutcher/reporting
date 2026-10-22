namespace Reporting.Abstractions;

public class CreateReportDto
{
    public string Name { get; set; } = string.Empty;
    public int? FolderId { get; set; }
    /// <summary>Pre-populates the new draft with this report's current content.</summary>
    public int? SourceReportId { get; set; }
}
