namespace Reporting.Api.Domain;

public class Report
{
    public Guid Id { get; set; }

    /// <summary>Assigned once at creation and never reused; shown to users as "R-{Number}".</summary>
    public int Number { get; set; }

    public string Name { get; set; } = string.Empty;
    public Guid? FolderId { get; set; }
    public Folder? Folder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<ReportRevision> Revisions { get; set; } = new();
}
