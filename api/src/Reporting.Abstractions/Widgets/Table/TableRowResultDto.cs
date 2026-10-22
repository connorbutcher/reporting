namespace Reporting.Abstractions;

public class TableRowResultDto
{
    public Guid Id { get; set; }

    /// <summary>One entry per requested column.</summary>
    public Dictionary<Guid, TableCellDto> Cells { get; set; } = new();
}
