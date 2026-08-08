namespace Reporting.Api.Domain;

public enum RevisionKind
{
    Draft,
    Published
}

/// <summary>
/// The content of a report at one point in time. A report has at most one
/// <see cref="RevisionKind.Draft"/> revision (its checked-out working copy)
/// and zero or more immutable <see cref="RevisionKind.Published"/> revisions,
/// numbered sequentially per report.
/// </summary>
public class ReportRevision
{
    public Guid Id { get; set; }
    public Guid ReportId { get; set; }
    public Report? Report { get; set; }
    public RevisionKind Kind { get; set; }
    public int? VersionNumber { get; set; }
    public int Columns { get; set; } = 12;
    public int Rows { get; set; } = 10;
    public DateTime CreatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }

    /// <summary>Rich-text (HTML) description of what changed, entered when publishing. Null for drafts.</summary>
    public string? Notes { get; set; }

    /// <summary>
    /// JSON-serialized report-level filters: one entry per dataset, applied to every
    /// widget bound to that dataset. Stored as a blob for the same reason widget
    /// configs are — it deep-copies with the revision for free on checkout/publish.
    /// </summary>
    public string FiltersJson { get; set; } = "[]";

    public List<Widget> Widgets { get; set; } = new();
}
