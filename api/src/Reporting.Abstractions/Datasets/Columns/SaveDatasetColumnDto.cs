namespace Reporting.Abstractions;

public class SaveDatasetColumnDto
{
    public string Name { get; set; } = string.Empty;
    public DatasetColumnType Type { get; set; } = DatasetColumnType.String;
}
