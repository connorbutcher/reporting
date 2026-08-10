namespace Reporting.Database;

public class DatasetRow
{
    public Guid Id { get; set; }
    public Guid DatasetId { get; set; }
    public Dataset? Dataset { get; set; }

    /// <summary>One cell per column the row has a value for.</summary>
    public List<DatasetCell> Cells { get; set; } = new();
}
