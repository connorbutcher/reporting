namespace Reporting.Database;

public class Report
{
    public int Id { get; set; }

    /// <summary>Stable external/reference id, exposed through the API (report routes, cross-references).</summary>
    public Guid RefId { get; set; }

    /// <summary>Assigned once at creation and never reused; shown to users as "R-{Number}".</summary>
    public int Number { get; set; }

    public string Name { get; set; } = string.Empty;
    public int? FolderId { get; set; }
    public Folder? Folder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<ReportRevision> Revisions { get; set; } = new();
}
