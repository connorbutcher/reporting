namespace Reporting.Database;

public class Dataset
{
    public int Id { get; set; }

    /// <summary>
    /// The revision that owns this dataset. Datasets are part of a revision's content, deep-copied
    /// alongside its widgets on checkout/publish, so a report's data can differ per version.
    /// </summary>
    public int ReportRevisionId { get; set; }
    public ReportRevision? ReportRevision { get; set; }

    public string Name { get; set; } = string.Empty;
    public List<DatasetColumn> Columns { get; set; } = new();
    public List<DatasetRow> Rows { get; set; } = new();
}
