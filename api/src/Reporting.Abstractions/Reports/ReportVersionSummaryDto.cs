namespace Reporting.Abstractions;

public class ReportVersionSummaryDto
{
    public int VersionNumber { get; set; }
    public DateTime PublishedAt { get; set; }
    public string? Notes { get; set; }
}
