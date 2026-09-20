namespace Reporting.Database;

/// <summary>
/// A user's own filters for viewing a report — what they've narrowed it to, kept so the report opens
/// the way they left it. Like <see cref="ReportFavorite"/> and <see cref="ReportView"/> it keys on the
/// report, not a version: the filters name widgets and datasets by stable id, so they carry across
/// versions. One row per (user, report), enforced by a unique index; saving overwrites it, and a user
/// with no changes from the published filters simply has no row. Both foreign keys cascade.
/// </summary>
public class ReportViewState
{
    /// <summary>The longest <see cref="Filters"/> the server keeps — far beyond any filter set a reader builds.</summary>
    public const int MaxFiltersLength = 32_000;

    public int Id { get; set; }

    public int UserId { get; set; }

    public int ReportId { get; set; }

    /// <summary>
    /// The reader's changes from the published filters, in the front-end's compact URL-safe encoding
    /// (the same string the viewer keeps in its <c>filters</c> query param). Opaque to the server: it
    /// stores and returns it without interpreting it, so the encoding can evolve client-side.
    /// </summary>
    public string Filters { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; }
}
