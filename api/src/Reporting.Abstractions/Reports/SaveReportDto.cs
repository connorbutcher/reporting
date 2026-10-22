namespace Reporting.Abstractions;

public class SaveReportDto
{
    public string Name { get; set; } = string.Empty;
    public int? FolderId { get; set; }
}
