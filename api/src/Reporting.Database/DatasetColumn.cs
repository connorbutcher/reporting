using Reporting.Abstractions;

namespace Reporting.Database;

public class DatasetColumn
{
    public int Id { get; set; }

    /// <summary>Stable external/reference id, used in widget/filter JSON and exposed through the API.</summary>
    public Guid RefId { get; set; }

    public int DatasetId { get; set; }
    public Dataset? Dataset { get; set; }
    public string Name { get; set; } = string.Empty;
    public DatasetColumnType Type { get; set; }

    // Left-to-right position of the column within the dataset.
    public int Order { get; set; }

    /// <summary>The formula this column is computed from, in the formula language; null for an ordinary column. A computed column's cells are calculated server-side and stored like typed ones, so everything downstream (filters, charts, tolerances) sees an ordinary column.</summary>
    public string? FormulaExpression { get; set; }

    /// <summary>Why <see cref="FormulaExpression"/> can't currently be evaluated; null when it's healthy.</summary>
    public string? FormulaError { get; set; }

    public bool IsComputed => FormulaExpression is not null;

    // Free-form per-column configuration (formatting, display hints, etc.).
    public string ConfigurationJson { get; set; } = "{}";
}
