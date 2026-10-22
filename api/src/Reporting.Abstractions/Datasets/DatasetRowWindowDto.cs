namespace Reporting.Abstractions;

/// <summary>
/// A contiguous window of a dataset's rows, for the editor grid's lazy virtual
/// scroll: <see cref="Rows"/> is the slice starting at the requested offset, and
/// <see cref="Total"/> is the full row count so the grid can size its scrollbar.
/// </summary>
public class DatasetRowWindowDto
{
    public int Total { get; set; }
    public List<DatasetRowDto> Rows { get; set; } = new();
}
