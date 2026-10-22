namespace Reporting.Abstractions;

/// <summary>
/// What changing a column to another type would newly break: only uses that work on the column's
/// current type but not on the new one (a measure that needs a number, a filter operator the new type
/// doesn't offer). Uses that are already broken, or that work on any type, are not listed.
/// </summary>
public class ColumnTypeImpactDto
{
    public DatasetColumnType From { get; set; }
    public DatasetColumnType To { get; set; }

    /// <summary>Each widget or page filter that would break; its <see cref="ColumnUseDto.Roles"/> say what stops working.</summary>
    public List<ColumnUseDto> Breaks { get; set; } = new();
}
