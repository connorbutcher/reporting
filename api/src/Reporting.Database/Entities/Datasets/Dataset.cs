namespace Reporting.Database;

public class Dataset
{
    public int Id { get; set; }

    /// <summary>Datasets are deep-copied with their revision, so data can differ per version.</summary>
    public int ReportRevisionId { get; set; }
    public ReportRevision? ReportRevision { get; set; }

    public string Name { get; set; } = string.Empty;

    public int DatasetSourceId { get; set; }
    public DatasetSource? Source { get; set; }

    /// <summary>Polymorphic on the source; see <see cref="Reporting.Abstractions.DatasetSourceConfig"/>.</summary>
    public string SourceConfigJson { get; set; } = "{}";

    public List<DatasetColumn> Columns { get; set; } = new();
    public List<DatasetRow> Rows { get; set; } = new();
}
