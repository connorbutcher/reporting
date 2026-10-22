using System.Text.Json;
using Reporting.Abstractions;

namespace Reporting.DAL.Repositories;

internal static class ColumnUses
{
    public static ColumnUseDto Widget(ScanWidget widget, List<string> roles)
    {
        return new ColumnUseDto
        {
            Kind = ColumnUseKind.Widget,
            WidgetId = widget.RefId,
            WidgetTitle = TitleOf(widget.ConfigJson),
            WidgetType = widget.Type,
            TabName = widget.TabName,
            Roles = roles,
        };
    }

    public static ColumnUseDto ReportFilter(List<string> roles)
    {
        return new ColumnUseDto { Kind = ColumnUseKind.ReportFilter, Roles = roles };
    }

    public static ColumnUseDto FilteredDataset(string datasetName, List<string> roles)
    {
        return new ColumnUseDto { Kind = ColumnUseKind.FilteredDataset, WidgetTitle = datasetName, Roles = roles };
    }

    /// <summary>The distinct roles in first-seen order, suffixed with a count when repeated.</summary>
    public static List<string> Roles(IEnumerable<string> roles)
    {
        return roles.GroupBy(r => r)
            .Select(g => g.Count() > 1 ? $"{g.Key} ×{g.Count()}" : g.Key)
            .ToList();
    }

    private static string? TitleOf(string configJson)
    {
        try
        {
            using var document = JsonDocument.Parse(configJson);
            foreach (var property in document.RootElement.EnumerateObject())
            {
                if (string.Equals(property.Name, "title", StringComparison.OrdinalIgnoreCase))
                {
                    return property.Value.ValueKind == JsonValueKind.String ? property.Value.GetString() : null;
                }
            }
        }
        catch (Exception ex) when (ex is JsonException or InvalidOperationException)
        {
            // An unreadable config just has no title.
        }
        return null;
    }
}
