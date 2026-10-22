namespace Reporting.Abstractions;

public class ReportSearchResultDto
{
    public int Id { get; set; }
    public int Number { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>See <see cref="ReportSummaryDto.HasDraft"/>.</summary>
    public bool HasDraft { get; set; }

    public int? LatestVersionNumber { get; set; }

    /// <summary>The caller's effective access.</summary>
    public AccessLevel AccessLevel { get; set; }

    public bool IsFavorite { get; set; }

    public DateTime ModifiedAt { get; set; }
    public string FolderPath { get; set; } = string.Empty;
}
