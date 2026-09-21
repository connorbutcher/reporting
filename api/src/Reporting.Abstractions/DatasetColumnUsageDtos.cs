namespace Reporting.Abstractions;

/// <summary>What is using a column: a widget in the report, or the report's own page-level filter.</summary>
public enum ColumnUseKind
{
    Widget,
    ReportFilter
}

/// <summary>One place in a report that refers to a column — the widget (or report filter) and how it uses it.</summary>
public class ColumnUseDto
{
    public ColumnUseKind Kind { get; set; }

    /// <summary>The widget's reference id; null for a report-level filter.</summary>
    public Guid? WidgetId { get; set; }

    /// <summary>The widget's own title, which may be blank; null for a report-level filter.</summary>
    public string? WidgetTitle { get; set; }

    public WidgetType? WidgetType { get; set; }

    /// <summary>The tab the widget sits on; null for a report-level filter.</summary>
    public string? TabName { get; set; }

    /// <summary>
    /// How the column is used, e.g. "Table column", "Filter condition ×2", "X / category column". In a
    /// type-change impact these are instead what would stop working, e.g. "Value column needs a number". Never empty.
    /// </summary>
    public List<string> Roles { get; set; } = new();
}

/// <summary>Every use of one column.</summary>
public class ColumnUsageDto
{
    public Guid ColumnId { get; set; }
    public List<ColumnUseDto> Uses { get; set; } = new();
}

/// <summary>
/// Where a dataset's columns are used across the draft report that owns it, so removing a column can
/// be seen to break the widgets that depend on it. Lists only columns that are used somewhere.
/// </summary>
public class DatasetColumnUsageDto
{
    public List<ColumnUsageDto> Columns { get; set; } = new();
}

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
