namespace Reporting.Abstractions;

/// <summary>A selectable dataset source system, for the source pickers.</summary>
public class DatasetSourceDto
{
    public int Id { get; set; }
    public DatasetSourceKey Key { get; set; }
    public string Name { get; set; } = string.Empty;
}
