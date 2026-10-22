namespace Reporting.Database;

/// <summary>The last time a user opened a report, updated in place. One per (user, report).</summary>
public class ReportView
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public int ReportId { get; set; }

    public DateTime ViewedAt { get; set; }
}
