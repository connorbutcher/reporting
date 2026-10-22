namespace Reporting.Abstractions;

public class ColumnUseDto
{
    public ColumnUseKind Kind { get; set; }

    // The widget fields are null for a report-level filter.
    public Guid? WidgetId { get; set; }

    public string? WidgetTitle { get; set; }

    public WidgetType? WidgetType { get; set; }

    public string? TabName { get; set; }

    /// <summary>e.g. "Table column"; in a type-change impact, what would stop working. Never empty.</summary>
    public List<string> Roles { get; set; } = new();
}
