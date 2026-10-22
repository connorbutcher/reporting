namespace Reporting.Abstractions;

public class WidgetDto
{
    public Guid Id { get; set; }
    public WidgetType Type { get; set; }
    public int X { get; set; }
    public int Y { get; set; }
    public int W { get; set; }
    public int H { get; set; }
    public WidgetConfig Config { get; set; } = null!;
}
