namespace Reporting.Abstractions;

public class DatasetSummaryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>The source system this dataset draws from.</summary>
    public DatasetSourceKey Source { get; set; }
}
