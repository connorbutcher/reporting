namespace Reporting.Api.Domain;

public class Dataset
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<DatasetRecord> Records { get; set; } = new();
}

public class DatasetRecord
{
    public Guid Id { get; set; }
    public Guid DatasetId { get; set; }
    public Dataset? Dataset { get; set; }
    public List<DatasetFieldValue> Fields { get; set; } = new();
}
