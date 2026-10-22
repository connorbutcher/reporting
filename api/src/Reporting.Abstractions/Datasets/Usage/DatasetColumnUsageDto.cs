namespace Reporting.Abstractions;

/// <summary>Where a dataset's columns are used in its draft report. Lists only used columns.</summary>
public class DatasetColumnUsageDto
{
    public List<ColumnUsageDto> Columns { get; set; } = new();
}
