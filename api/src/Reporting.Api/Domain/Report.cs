namespace Reporting.Api.Domain;

public class Report
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<Widget> Widgets { get; set; } = new();
}
