namespace Reporting.Database;

public class Report
{
    public int Id { get; set; }

    public Guid RefId { get; set; }

    /// <summary>Never reused; shown as "R-{Number}".</summary>
    public int Number { get; set; }

    public string Name { get; set; } = string.Empty;
    public int? FolderId { get; set; }
    public Folder? Folder { get; set; }

    /// <summary>False cuts the inheritance chain so only this report's own grants apply.</summary>
    public bool InheritsPermissions { get; set; } = true;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<ReportRevision> Revisions { get; set; } = new();
}
