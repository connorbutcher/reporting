namespace Reporting.Abstractions;

public class DatasetQueryResultDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<DatasetRowDto> Rows { get; set; } = new();

    /// <summary>Before filtering.</summary>
    public int TotalRowCount { get; set; }
    public int MatchedRowCount { get; set; }
}
