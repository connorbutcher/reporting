namespace Reporting.Database;

/// <summary>Keyed on the report, not a version. One per (user, report).</summary>
public class ReportFavorite
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public int ReportId { get; set; }

    public DateTime CreatedAt { get; set; }
}
