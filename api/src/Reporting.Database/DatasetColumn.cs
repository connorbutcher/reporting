using Reporting.Abstractions;

namespace Reporting.Database;

public class DatasetColumn
{
    public Guid Id { get; set; }
    public Guid DatasetId { get; set; }
    public Dataset? Dataset { get; set; }
    public string Name { get; set; } = string.Empty;
    public DatasetColumnType Type { get; set; }

    // Left-to-right position of the column within the dataset.
    public int Order { get; set; }

    // Free-form per-column configuration (formatting, display hints, etc.).
    public string ConfigurationJson { get; set; } = "{}";
}
