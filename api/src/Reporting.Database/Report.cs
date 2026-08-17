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

    /// <summary>
    /// When true (the default) the report's access is its own grants on top of its
    /// folder's (or the root baseline when it sits at the root). When false the chain is
    /// cut here, so a single report can be locked down inside an otherwise-open folder.
    /// </summary>
    public bool InheritsPermissions { get; set; } = true;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<ReportRevision> Revisions { get; set; } = new();
}
