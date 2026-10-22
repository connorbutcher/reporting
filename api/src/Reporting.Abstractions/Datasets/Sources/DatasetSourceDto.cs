namespace Reporting.Abstractions;

public class DatasetSourceDto
{
    public int Id { get; set; }
    public DatasetSourceKey Key { get; set; }
    public string Name { get; set; } = string.Empty;
}
