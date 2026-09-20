namespace Reporting.Database;

/// <summary>
/// An immutable snapshot of shared viewing filters, addressed by a short id so a link carries no filter
/// data. Keyed on the report, not a version. Deduplicated per report by <see cref="FiltersHash"/>, so
/// sharing the same filters again gives the same id.
/// </summary>
public class ReportSharedView
{
    public const int ShortIdLength = 10;

    public int Id { get; set; }

    /// <summary>What a link carries: lowercase letters and digits, so it's safe under a case-insensitive collation.</summary>
    public string ShortId { get; set; } = string.Empty;

    public int ReportId { get; set; }

    /// <summary>The front-end's encoding, opaque to the server.</summary>
    public string Filters { get; set; } = string.Empty;

    /// <summary>SHA-256 (hex) of <see cref="Filters"/>.</summary>
    public string FiltersHash { get; set; } = string.Empty;

    /// <summary>Who first shared these filters; null once that user is gone. The link keeps working.</summary>
    public int? CreatedByUserId { get; set; }

    public DateTime CreatedAt { get; set; }
}
