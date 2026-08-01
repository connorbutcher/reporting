namespace Reporting.Api.Domain;

public class Report
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Columns { get; set; } = 12;
    public int Rows { get; set; } = 10;
    public List<Widget> Widgets { get; set; } = new();
}
