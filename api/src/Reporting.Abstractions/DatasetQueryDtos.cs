namespace Reporting.Abstractions;

public class DatasetQueryDto
{
    /// <summary>Null or an empty group means "no filtering".</summary>
    public FilterGroupDto? Filter { get; set; }
}

public class DatasetQueryResultDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<DatasetRowDto> Rows { get; set; } = new();

    /// <summary>Rows in the dataset before filtering, so the widget can show "142 of 1,203".</summary>
    public int TotalRowCount { get; set; }
    public int MatchedRowCount { get; set; }
}
