namespace Reporting.Abstractions;

public class ReportSummaryDto
{
    public int Id { get; set; }
    public int Number { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? FolderId { get; set; }

    /// <summary>
    /// Whether the report has a checked-out draft. Only ever true for a caller who can edit it
    /// (<see cref="AccessLevel.Editor"/> or above) — a viewer must not learn a draft exists, so this
    /// is forced false below Editor regardless of the underlying state.
    /// </summary>
    public bool HasDraft { get; set; }

    public int? LatestVersionNumber { get; set; }

    /// <summary>The calling user's effective access to this report — drives what the client offers (view vs edit).</summary>
    public AccessLevel AccessLevel { get; set; }

    /// <summary>Whether the calling user has starred this report.</summary>
    public bool IsFavorite { get; set; }

    public DateTime ModifiedAt { get; set; }
}
