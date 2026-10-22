namespace Reporting.Abstractions;

public class ReportSummaryDto
{
    public int Id { get; set; }
    public int Number { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? FolderId { get; set; }

    /// <summary>Forced false below Editor so a viewer can't learn a draft exists.</summary>
    public bool HasDraft { get; set; }

    public int? LatestVersionNumber { get; set; }

    /// <summary>The caller's effective access.</summary>
    public AccessLevel AccessLevel { get; set; }

    public bool IsFavorite { get; set; }

    public DateTime ModifiedAt { get; set; }
}
