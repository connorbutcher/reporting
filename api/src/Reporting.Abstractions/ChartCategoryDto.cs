namespace Reporting.Abstractions;

/// <summary>
/// What a grouping chart (bar, combination, box plot, Xbar-R) knows about one of its categories
/// beyond its label: how it sorts naturally, so several datasets' categories can be merged in order,
/// and the conditions that select its rows, for drill-through.
/// </summary>
public class ChartCategoryDto
{
    /// <summary>The natural sort key of a numeric category, or a date category's epoch milliseconds; null otherwise.</summary>
    public double? SortNumber { get; set; }

    /// <summary>The natural sort key of a text category; null for numeric/date ones and blanks.</summary>
    public string? SortText { get; set; }

    /// <summary>True for the blank category, which sorts last.</summary>
    public bool IsBlank { get; set; }

    /// <summary>True for the "Other" category a Top N sort rolls the remaining categories into.</summary>
    public bool IsOther { get; set; }

    /// <summary>Conditions selecting the rows behind this category; null when they can't be expressed (e.g. "Other").</summary>
    public FilterGroupDto? Drill { get; set; }
}
