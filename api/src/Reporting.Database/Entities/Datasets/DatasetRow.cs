namespace Reporting.Database;

public class DatasetRow
{
    public int Id { get; set; }

    /// <summary>The id used in tolerance JSON and the API.</summary>
    public Guid RefId { get; set; }

    public int DatasetId { get; set; }
    public Dataset? Dataset { get; set; }

    public List<DatasetCell> Cells { get; set; } = new();
}
