using System.Text.Json;
using Reporting.Abstractions;

namespace Reporting.DAL.Repositories;

/// <summary>A filter condition's operator and raw operands, as stored — enough to tell whether it still works on another column type.</summary>
public sealed record FilterConditionRef(string Operator, IReadOnlyList<string> Values);

/// <summary>
/// One place a column's id appears in some JSON: what that place means, and what it needs of the
/// column's type — a number (a measure, a histogram's bins, a tolerance limit…), or, for a filter
/// condition, an operator and operands that its column type must support.
/// </summary>
public readonly record struct ColumnReference(
    Guid ColumnId,
    string Role,
    bool NeedsNumber = false,
    FilterConditionRef? Condition = null);

/// <summary>
/// Finds every reference to a set of columns inside a widget's (or a report filter's) config JSON.
/// Column ids are globally unique GUIDs, so rather than know each widget type's shape the scanner
/// walks the whole document and matches any string equal to one of them — which keeps it correct as
/// widget types and options are added. What a reference <em>means</em> is read from where in the
/// document it sits (see <see cref="Describe"/>), and what it <em>needs</em> from the same place plus
/// the widget type (see <see cref="NeedsNumber"/>).
/// </summary>
public static class ColumnReferenceScanner
{
    private readonly record struct Context(WidgetType? WidgetType, string? Aggregate);

    public static List<ColumnReference> Scan(string json, IReadOnlySet<Guid> columnIds, WidgetType? widgetType = null)
    {
        var found = new List<ColumnReference>();
        if (columnIds.Count == 0 || string.IsNullOrWhiteSpace(json)) return found;

        JsonDocument document;
        try { document = JsonDocument.Parse(json); }
        catch (JsonException) { return found; } // Unreadable config can't reference anything we can name.

        using (document)
        {
            var root = document.RootElement;
            var context = new Context(widgetType, root.ValueKind == JsonValueKind.Object ? StringProperty(root, "aggregate") : null);
            Walk(root, new List<string>(), null, context, columnIds, found);
        }
        return found;
    }

    private static void Walk(
        JsonElement element, List<string> path, JsonElement? owner, Context context,
        IReadOnlySet<Guid> columnIds, List<ColumnReference> found)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                // A filter condition is an object naming a column and an operator; it is read whole, so
                // its operator and operands can be checked against another column type.
                var conditionColumn = ConditionColumn(element, columnIds);
                if (conditionColumn is { } id)
                {
                    found.Add(new ColumnReference(id, "Filter condition", Condition: new FilterConditionRef(
                        StringProperty(element, "operator") ?? "", StringArrayProperty(element, "values"))));
                }

                foreach (var property in element.EnumerateObject())
                {
                    if (conditionColumn is not null && string.Equals(property.Name, "columnId", StringComparison.OrdinalIgnoreCase))
                        continue;
                    path.Add(property.Name);
                    Walk(property.Value, path, element, context, columnIds, found);
                    path.RemoveAt(path.Count - 1);
                }
                break;

            case JsonValueKind.Array:
                // An array's items keep the array's own name in the path — `rowFields[]` is still `rowFields`.
                foreach (var item in element.EnumerateArray())
                    Walk(item, path, owner, context, columnIds, found);
                break;

            case JsonValueKind.String:
                if (Guid.TryParse(element.GetString(), out var column) && columnIds.Contains(column))
                    found.Add(new ColumnReference(column, Describe(path), NeedsNumber(path, owner, context)));
                break;
        }
    }

    private static Guid? ConditionColumn(JsonElement element, IReadOnlySet<Guid> columnIds)
    {
        var raw = StringProperty(element, "columnId");
        return raw is not null && StringProperty(element, "operator") is not null
            && Guid.TryParse(raw, out var id) && columnIds.Contains(id)
            ? id
            : null;
    }

    /// <summary>
    /// Whether this reference only works on a numeric column. Several depend on the widget: a bar's
    /// measures need numbers unless it just counts rows, a box plot's value and a histogram's bins
    /// always do, whereas a scatter chart plots text or dates on its axes happily.
    /// </summary>
    private static bool NeedsNumber(IReadOnlyList<string> path, JsonElement? owner, Context context)
    {
        var names = path.Select(p => p.ToLowerInvariant()).ToList();
        var last = names.Count > 0 ? names[^1] : "";
        var parent = names.Count > 1 ? names[^2] : "";

        // Tolerance limits are read as numbers, wherever they're pointed from.
        if (names.Contains("tolerance") || names.Contains("tolerancebands"))
            return last is "mincolumnid" or "maxcolumnid" or "concessionlowercolumnid" or "concessionuppercolumnid";

        var barLike = context.WidgetType is WidgetType.BarChart or WidgetType.ComboChart;
        var counting = string.Equals(context.Aggregate, "count", StringComparison.OrdinalIgnoreCase);

        return last switch
        {
            "valuecolumnids" => barLike && !counting,
            "ycolumnid" => context.WidgetType == WidgetType.BoxPlot || (barLike && !counting),
            "xcolumnid" => context.WidgetType == WidgetType.Histogram,
            // A table column that carries tolerance banding is compared to numeric limits.
            "columnid" when parent == "columns" => owner is { } o && o.TryGetProperty("tolerance", out var t) && t.ValueKind == JsonValueKind.Object,
            // A pivot measure reduces numbers, unless it just counts rows.
            "columnid" when parent == "measures" =>
                !string.Equals(owner is { } m ? StringProperty(m, "aggregate") : null, "count", StringComparison.OrdinalIgnoreCase),
            _ => false,
        };
    }

    /// <summary>
    /// A short reader-facing description of what a reference is, from the property names leading to it.
    /// Falls back to the property's own name, so a newly added option is still described sensibly.
    /// </summary>
    public static string Describe(IReadOnlyList<string> path)
    {
        var names = path.Select(p => p.ToLowerInvariant()).ToList();
        var last = names.Count > 0 ? names[^1] : "";
        var parent = names.Count > 1 ? names[^2] : "";

        // Conditions of any filter — a widget's own, a chart binding's, or a table's — read the same.
        if (names.Contains("filter")) return "Filter condition";

        if (names.Contains("tolerance") || names.Contains("tolerancebands"))
        {
            var inMatch = names.Contains("match");
            return last switch
            {
                "mincolumnid" => "Tolerance limit (min)",
                "maxcolumnid" => "Tolerance limit (max)",
                "concessionlowercolumnid" or "concessionuppercolumnid" => "Tolerance limit (concession)",
                "sourcecolumnid" when inMatch => "Tolerance match (limits column)",
                "columnid" when inMatch => "Tolerance match (this table's column)",
                _ => "Tolerance",
            };
        }

        return last switch
        {
            "columnid" => parent switch
            {
                "columns" => "Table column",
                "tooltipcolumns" => "Tooltip",
                "measures" => "Pivot measure",
                _ => "Column",
            },
            "sortcolumnid" => "Sort column",
            "xcolumnid" => "X / category column",
            "ycolumnid" => "Y / value column",
            "valuecolumnids" => "Value column",
            "seriescolumnid" => "Colour-by column",
            "rowfields" => "Pivot row grouping",
            _ => Humanise(path.Count > 0 ? path[^1] : ""),
        };
    }

    /// <summary>"someNewOption" → "Some new option".</summary>
    private static string Humanise(string name)
    {
        if (name.Length == 0) return "Column";
        var spaced = string.Concat(name.Select((c, i) => i > 0 && char.IsUpper(c) ? " " + char.ToLowerInvariant(c) : c.ToString()));
        return char.ToUpperInvariant(spaced[0]) + spaced[1..];
    }

    private static string? StringProperty(JsonElement element, string name)
    {
        foreach (var property in element.EnumerateObject())
            if (string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase))
                return property.Value.ValueKind == JsonValueKind.String ? property.Value.GetString() : null;
        return null;
    }

    private static List<string> StringArrayProperty(JsonElement element, string name)
    {
        foreach (var property in element.EnumerateObject())
        {
            if (!string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase)
                || property.Value.ValueKind != JsonValueKind.Array) continue;
            return property.Value.EnumerateArray()
                .Select(v => v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : v.ToString())
                .ToList();
        }
        return [];
    }
}
