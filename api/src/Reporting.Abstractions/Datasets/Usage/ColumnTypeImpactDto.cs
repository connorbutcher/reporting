namespace Reporting.Abstractions;

/// <summary>Uses that work on the current type but would break on the new one.</summary>
public class ColumnTypeImpactDto
{
    public DatasetColumnType From { get; set; }
    public DatasetColumnType To { get; set; }

    public List<ColumnUseDto> Breaks { get; set; } = new();
}
