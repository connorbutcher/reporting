namespace Reporting.Database;

/// <summary>A report has at most one draft and any number of immutable published versions.</summary>
public class ReportRevision
{
    public int Id { get; set; }

    public Guid RefId { get; set; }

    public int ReportId { get; set; }
    public Report? Report { get; set; }
    public RevisionKind Kind { get; set; }
    public int? VersionNumber { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }

    /// <summary>HTML; null for drafts.</summary>
    public string? Notes { get; set; }

    /// <summary>One entry per dataset. A blob so it deep-copies with the revision.</summary>
    public string FiltersJson { get; set; } = "[]";

    /// <summary>Always at least one.</summary>
    public List<Tab> Tabs { get; set; } = new();

    public List<Dataset> Datasets { get; set; } = new();
}
