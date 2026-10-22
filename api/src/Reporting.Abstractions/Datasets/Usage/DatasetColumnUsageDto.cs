namespace Reporting.Abstractions;

/// <summary>
/// Where a dataset's columns are used across the draft report that owns it, so removing a column can
/// be seen to break the widgets that depend on it. Lists only columns that are used somewhere.
/// </summary>
public class DatasetColumnUsageDto
{
    public List<ColumnUsageDto> Columns { get; set; } = new();
}
