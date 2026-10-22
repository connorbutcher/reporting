using Reporting.Abstractions;

namespace Reporting.Database;

public class Widget
{
    public int Id { get; set; }

    /// <summary>Client-generated and kept across versions, so only unique per tab.</summary>
    public Guid RefId { get; set; }

    public int TabId { get; set; }
    public Tab? Tab { get; set; }
    public WidgetType Type { get; set; }
    public int X { get; set; }
    public int Y { get; set; }
    public int W { get; set; }
    public int H { get; set; }

    /// <summary>A serialized <see cref="WidgetConfig"/>.</summary>
    public string ConfigJson { get; set; } = "{}";
}
