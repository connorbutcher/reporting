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

    /// <summary>The source system this dataset draws from. Required.</summary>
    public int DatasetSourceId { get; set; }
    public DatasetSource? Source { get; set; }

    /// <summary>
    /// The source-specific configuration blob, polymorphic on its source (see
    /// <see cref="Reporting.Abstractions.DatasetSourceConfig"/>). Serialized by the DAL;
    /// the shape always matches <see cref="Source"/>.
    /// </summary>
    public string SourceConfigJson { get; set; } = "{}";

    public List<DatasetColumn> Columns { get; set; } = new();
    public List<DatasetRow> Rows { get; set; } = new();
}
