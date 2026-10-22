namespace Reporting.Abstractions;

public class DatasetSummaryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public DatasetSourceKey Source { get; set; }
}
