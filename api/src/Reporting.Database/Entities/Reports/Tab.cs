namespace Reporting.Database;

public class Tab
{
    public int Id { get; set; }

    /// <summary>Client-generated and kept across versions, so only unique per revision.</summary>
    public Guid RefId { get; set; }

    public int ReportRevisionId { get; set; }
    public ReportRevision? ReportRevision { get; set; }

    public string Name { get; set; } = string.Empty;

    public int Order { get; set; }

    public int Columns { get; set; } = 48;
    public int Rows { get; set; } = 30;

    public List<Widget> Widgets { get; set; } = new();
}
