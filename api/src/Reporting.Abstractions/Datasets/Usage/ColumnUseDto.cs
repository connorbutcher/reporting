namespace Reporting.Abstractions;

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
