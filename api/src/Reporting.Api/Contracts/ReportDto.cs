using Reporting.Api.Domain;

namespace Reporting.Api.Contracts;

public class ReportDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Columns { get; set; } = 12;
    public int Rows { get; set; } = 10;
    public List<WidgetDto> Widgets { get; set; } = new();
}

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

public class CreateReportDto
{
    public string Name { get; set; } = string.Empty;
}
