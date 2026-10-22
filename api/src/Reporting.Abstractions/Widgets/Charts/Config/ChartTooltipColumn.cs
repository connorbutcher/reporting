namespace Reporting.Abstractions;

public class ChartTooltipColumn
{
    public Guid ColumnId { get; set; }
    public string? Prefix { get; set; }
    public string? Suffix { get; set; }

    /// <summary>Sent at query time only, so another dataset can fall back to its own column of this name.</summary>
    public string? ColumnName { get; set; }
}
