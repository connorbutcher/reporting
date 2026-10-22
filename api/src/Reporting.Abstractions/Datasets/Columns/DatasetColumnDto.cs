namespace Reporting.Abstractions;

public class DatasetColumnDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DatasetColumnType Type { get; set; }
    public int Order { get; set; }

    /// <summary>Null for an ordinary, editable column.</summary>
    public string? Formula { get; set; }

    /// <summary>Why the formula can't currently be evaluated; null when healthy.</summary>
    public string? FormulaError { get; set; }

    /// <summary>Always populated on read.</summary>
    public DatasetColumnConfig? Configuration { get; set; }
}
