namespace Reporting.Abstractions;

/// <summary>A slice of rows from the requested offset, plus the full row count for the scrollbar.</summary>
public class DatasetRowWindowDto
{
    public int Total { get; set; }
    public List<DatasetRowDto> Rows { get; set; } = new();
}
