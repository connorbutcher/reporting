namespace Reporting.Abstractions;

public class DatasetColumnDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DatasetColumnType Type { get; set; }
    public int Order { get; set; }

    /// <summary>The formula this column is computed from; null for an ordinary, editable column.</summary>
    public string? Formula { get; set; }

    /// <summary>Why the formula can't currently be evaluated (e.g. a column it uses was removed); null when it's healthy.</summary>
    public string? FormulaError { get; set; }

    /// <summary>
    /// The column's typed display configuration; the concrete shape matches <see cref="Type"/>
    /// (polymorphic on a "kind" discriminator). Always populated on read.
    /// </summary>
    public DatasetColumnConfig? Configuration { get; set; }
}
