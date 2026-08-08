namespace Reporting.Api.Domain;

public enum WidgetType
{
    DataTable,
    StaticText,
    Chart
}

public class Widget
{
    public Guid Id { get; set; }
    public Guid ReportRevisionId { get; set; }
    public ReportRevision? ReportRevision { get; set; }
    public WidgetType Type { get; set; }
    public int X { get; set; }
    public int Y { get; set; }
    public int W { get; set; }
    public int H { get; set; }

    // JSON-serialized widget-type-specific config (e.g. DataTableWidgetConfig).
    public string ConfigJson { get; set; } = "{}";
}
