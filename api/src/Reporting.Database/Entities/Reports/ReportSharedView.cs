namespace Reporting.Database;

/// <summary>An immutable filter snapshot behind a short link, deduplicated per report by <see cref="FiltersHash"/>.</summary>
public class ReportSharedView
{
    public const int ShortIdLength = 10;

    public int Id { get; set; }

    /// <summary>Lowercase letters and digits, so it's safe under a case-insensitive collation.</summary>
    public string ShortId { get; set; } = string.Empty;

    public int ReportId { get; set; }

    /// <summary>Opaque to the server.</summary>
    public string Filters { get; set; } = string.Empty;

    /// <summary>SHA-256 (hex) of <see cref="Filters"/>.</summary>
    public string FiltersHash { get; set; } = string.Empty;

    /// <summary>Null once that user is gone; the link keeps working.</summary>
    public int? CreatedByUserId { get; set; }

    public DateTime CreatedAt { get; set; }
}
