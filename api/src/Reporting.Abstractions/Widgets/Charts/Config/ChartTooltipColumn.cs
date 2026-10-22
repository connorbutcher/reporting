namespace Reporting.Abstractions;

/// <summary>One extra field shown in a point's tooltip, beyond the X/Y values.</summary>
public class ChartTooltipColumn
{
    public Guid ColumnId { get; set; }
    public string? Prefix { get; set; }
    public string? Suffix { get; set; }

    /// <summary>
    /// The column's name, sent at query time only: a dataset other than the one the tooltip columns
    /// were picked from has different column ids, so it falls back to its own column of this name.
    /// </summary>
    public string? ColumnName { get; set; }
}
