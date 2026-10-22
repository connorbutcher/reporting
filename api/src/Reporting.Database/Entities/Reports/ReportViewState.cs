namespace Reporting.Database;

/// <summary>
/// A user's saved filters for viewing a report. Keyed on the report, not a version: the filters name
/// widgets and datasets by stable id, so they carry across versions. One row per (user, report); a user
/// with no changes from the published filters has none.
/// </summary>
public class ReportViewState
{
    public const int MaxFiltersLength = 32_000;

    public int Id { get; set; }

    public int UserId { get; set; }

    public int ReportId { get; set; }

    /// <summary>The front-end's compact URL-safe encoding of what the user changed. Opaque to the server.</summary>
    public string Filters { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; }
}
