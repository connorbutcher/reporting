namespace Reporting.Database;

/// <summary>
/// A user has starred a report. Keyed on the report — not any one version — because the report is
/// the durable identity a user cares about; its versions come and go. At most one row per
/// (user, report), enforced by a unique index. Both foreign keys cascade, so deleting the user or
/// the report removes the star.
/// </summary>
public class ReportFavorite
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public int ReportId { get; set; }

    public DateTime CreatedAt { get; set; }
}
