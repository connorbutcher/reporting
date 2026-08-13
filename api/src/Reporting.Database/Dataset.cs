namespace Reporting.Database;

public class Dataset
{
    public int Id { get; set; }

    /// <summary>Stable external/reference id, used in widget/filter JSON and exposed through the API.</summary>
    public Guid RefId { get; set; }

    public string Name { get; set; } = string.Empty;
    public List<DatasetColumn> Columns { get; set; } = new();
    public List<DatasetRow> Rows { get; set; } = new();
}
