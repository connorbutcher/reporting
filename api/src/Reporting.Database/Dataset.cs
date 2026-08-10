namespace Reporting.Database;

public class Dataset
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<DatasetColumn> Columns { get; set; } = new();
    public List<DatasetRow> Rows { get; set; } = new();
}
