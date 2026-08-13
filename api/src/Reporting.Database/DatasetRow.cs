namespace Reporting.Database;

public class DatasetRow
{
    public int Id { get; set; }

    /// <summary>Stable external/reference id, used in tolerance JSON and exposed through the API.</summary>
    public Guid RefId { get; set; }

    public int DatasetId { get; set; }
    public Dataset? Dataset { get; set; }

    /// <summary>One cell per column the row has a value for.</summary>
    public List<DatasetCell> Cells { get; set; } = new();
}
