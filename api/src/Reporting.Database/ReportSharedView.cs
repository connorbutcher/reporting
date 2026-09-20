namespace Reporting.Database;

/// <summary>
/// An immutable snapshot of a set of viewing filters that someone chose to share, addressed by a short
/// <see cref="ShortId"/> so a link carries only that id and no filter data. Keyed on the report, not a
/// version — the filters name widgets and datasets by stable id, so a link keeps working as the report
/// is republished. A snapshot never changes once created: editing your own filters afterwards makes a
/// new one, so a link means the same thing to everyone who opens it.
/// <para>
/// Snapshots are deduplicated per report by <see cref="FiltersHash"/>, so sharing the same filters
/// twice gives the same id (and repeated shares don't pile up rows). Deleting the report removes its
/// snapshots; the creator is only recorded, so removing them leaves the link working.
/// </para>
/// </summary>
public class ReportSharedView
{
    /// <summary>Length of a generated <see cref="ShortId"/>.</summary>
    public const int ShortIdLength = 10;

    public int Id { get; set; }

    /// <summary>The id a link carries. Lowercase letters and digits only, so it is safe under a case-insensitive collation.</summary>
    public string ShortId { get; set; } = string.Empty;

    public int ReportId { get; set; }

    /// <summary>The filters, in the front-end's compact URL-safe encoding. Opaque to the server, as for <see cref="ReportViewState.Filters"/>.</summary>
    public string Filters { get; set; } = string.Empty;

    /// <summary>SHA-256 (hex) of <see cref="Filters"/>: the key that finds an existing snapshot of the same filters.</summary>
    public string FiltersHash { get; set; } = string.Empty;

    /// <summary>Who first shared these filters. Null once that user is gone.</summary>
    public int? CreatedByUserId { get; set; }

    public DateTime CreatedAt { get; set; }
}
