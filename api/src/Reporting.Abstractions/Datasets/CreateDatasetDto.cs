namespace Reporting.Abstractions;

public class CreateDatasetDto
{
    public string Name { get; set; } = string.Empty;
    public int SourceId { get; set; }
}
