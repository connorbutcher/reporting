namespace Reporting.Abstractions;

/// <summary>A grouping chart category's natural sort key, for merging datasets in order, and its drill-through.</summary>
public class ChartCategoryDto
{
    /// <summary>A number, or a date's epoch milliseconds.</summary>
    public double? SortNumber { get; set; }

    public string? SortText { get; set; }

    /// <summary>Sorts last.</summary>
    public bool IsBlank { get; set; }

    /// <summary>The Top N "Other" roll-up.</summary>
    public bool IsOther { get; set; }

    /// <summary>Null when it can't be expressed, e.g. "Other".</summary>
    public FilterGroupDto? Drill { get; set; }
}
