namespace Reporting.Abstractions;

/// <summary>A report match from a name/number search, with its folder location for display.</summary>
public class ReportSearchResultDto
{
    public int Id { get; set; }
    public int Number { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>Only ever true for a caller who can edit the report — see <see cref="ReportSummaryDto.HasDraft"/>.</summary>
    public bool HasDraft { get; set; }

    public int? LatestVersionNumber { get; set; }

    /// <summary>The calling user's effective access to this report — drives what the client offers (view vs edit).</summary>
    public AccessLevel AccessLevel { get; set; }

    /// <summary>Whether the calling user has starred this report.</summary>
    public bool IsFavorite { get; set; }

    public DateTime ModifiedAt { get; set; }
    public string FolderPath { get; set; } = string.Empty;
}
