using Reporting.Abstractions;

namespace Reporting.Database;

public class DatasetColumn
{
    public int Id { get; set; }

    /// <summary>The id used in widget and filter JSON and the API.</summary>
    public Guid RefId { get; set; }

    public int DatasetId { get; set; }
    public Dataset? Dataset { get; set; }
    public string Name { get; set; } = string.Empty;
    public DatasetColumnType Type { get; set; }

    public int Order { get; set; }

    /// <summary>Null for an ordinary column. Computed cells are stored like typed ones, so readers see an ordinary column.</summary>
    public string? FormulaExpression { get; set; }

    /// <summary>Null when healthy.</summary>
    public string? FormulaError { get; set; }

    public bool IsComputed => FormulaExpression is not null;

    public string ConfigurationJson { get; set; } = "{}";
}
