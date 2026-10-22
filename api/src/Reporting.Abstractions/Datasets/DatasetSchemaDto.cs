namespace Reporting.Abstractions;

public class DatasetSchemaDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public int SourceId { get; set; }

    public DatasetSourceKey Source { get; set; }

    /// <summary>Its concrete shape matches <see cref="Source"/>.</summary>
    public DatasetSourceConfig SourceConfig { get; set; } = null!;

    public List<DatasetColumnDto> Columns { get; set; } = new();
}
