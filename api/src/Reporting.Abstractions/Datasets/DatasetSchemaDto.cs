namespace Reporting.Abstractions;

public class DatasetSchemaDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>The dataset source's primary key, for the source picker.</summary>
    public int SourceId { get; set; }

    /// <summary>The source system this dataset draws from.</summary>
    public DatasetSourceKey Source { get; set; }

    /// <summary>The source-specific configuration; its concrete shape matches <see cref="Source"/>.</summary>
    public DatasetSourceConfig SourceConfig { get; set; } = null!;

    public List<DatasetColumnDto> Columns { get; set; } = new();
}
