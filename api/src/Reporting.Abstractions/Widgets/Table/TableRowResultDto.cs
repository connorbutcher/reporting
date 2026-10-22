namespace Reporting.Abstractions;

public class TableRowResultDto
{
    public Guid Id { get; set; }

    /// <summary>Keyed by column id, one entry per column in the request's Columns list.</summary>
    public Dictionary<Guid, TableCellDto> Cells { get; set; } = new();
}
