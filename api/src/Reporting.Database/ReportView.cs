namespace Reporting.Database;

/// <summary>
/// Records that a user opened a report, for the "recently viewed" list. Like <see cref="ReportFavorite"/>
/// it keys on the report rather than a version — the list answers "which reports have I been in lately",
/// and the report is the stable identity. One row per (user, report): re-opening a report updates
/// <see cref="ViewedAt"/> in place rather than accumulating a history, so the table stays one-row-per-report
/// and ordering by <see cref="ViewedAt"/> descending gives the most-recent-first list directly. Both
/// foreign keys cascade.
/// </summary>
public class ReportView
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public int ReportId { get; set; }

    public DateTime ViewedAt { get; set; }
}
