using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// Reads where a dataset's columns are used across the report revision that owns the dataset — every
/// widget's config and the report's page-level filters — so a column that is about to be removed, or
/// given another type, can show what it would break. A dataset belongs to one revision (deep-copied
/// per revision), so only that revision's widgets can refer to its columns; other versions keep their own copies.
/// </summary>
public class DatasetColumnUsageService(ReportingDbContext db)
{
    private sealed record ScanWidget(Guid RefId, WidgetType Type, string ConfigJson, string TabName);

    private sealed record Source(
        Dictionary<Guid, DatasetColumnType> ColumnTypes,
        List<ScanWidget> Widgets,
        List<string> FilterJsons);

    /// <summary>A reason a reference stops working. The key ignores the column type, so a break that already exists can be told from a new one.</summary>
    private readonly record struct Reason(string Key, string Message);

    /// <summary>Every use of each of the dataset's columns; only columns that are used appear.</summary>
    public async Task<DatasetColumnUsageDto?> GetAsync(int datasetId)
    {
        var source = await LoadAsync(datasetId);
        if (source is null) return null;

        var columnIds = source.ColumnTypes.Keys.ToHashSet();
        var uses = new Dictionary<Guid, List<ColumnUseDto>>();

        foreach (var widget in source.Widgets)
        {
            foreach (var byColumn in ColumnReferenceScanner.Scan(widget.ConfigJson, columnIds, widget.Type).GroupBy(r => r.ColumnId))
            {
                if (!uses.TryGetValue(byColumn.Key, out var list)) uses[byColumn.Key] = list = new List<ColumnUseDto>();
                list.Add(WidgetUse(widget, Roles(byColumn.Select(r => r.Role))));
            }
        }

        foreach (var filterJson in source.FilterJsons)
        {
            foreach (var byColumn in ColumnReferenceScanner.Scan(filterJson, columnIds).GroupBy(r => r.ColumnId))
            {
                if (!uses.TryGetValue(byColumn.Key, out var list)) uses[byColumn.Key] = list = new List<ColumnUseDto>();
                list.Add(FilterUse(Roles(byColumn.Select(_ => "Filter condition"))));
            }
        }

        return new DatasetColumnUsageDto
        {
            Columns = uses.Select(u => new ColumnUsageDto { ColumnId = u.Key, Uses = u.Value }).ToList(),
        };
    }

    /// <summary>
    /// What changing a column to <paramref name="newType"/> would newly break. Null when the dataset or
    /// column doesn't exist. Only references that work on the current type but not the new one are
    /// reported, each with what stops working — a measure or histogram that needs a number, a filter
    /// operator the new type doesn't offer, an operand that no longer parses.
    /// </summary>
    public async Task<ColumnTypeImpactDto?> GetTypeChangeImpactAsync(int datasetId, Guid columnId, DatasetColumnType newType)
    {
        var source = await LoadAsync(datasetId);
        if (source is null || !source.ColumnTypes.TryGetValue(columnId, out var oldType)) return null;

        var impact = new ColumnTypeImpactDto { From = oldType, To = newType };
        if (oldType == newType) return impact;

        // An unpopulated catalogue table (a fresh test database) means "use the built-in defaults", not "no operators exist".
        var loaded = await FilterOperators.LoadCatalogueAsync(db);
        var catalogue = loaded.Count == 0 ? null : loaded;
        var only = new HashSet<Guid> { columnId };

        List<string> Breaks(IEnumerable<ColumnReference> references) =>
            references
                .SelectMany(r =>
                {
                    var before = Reasons(r, oldType, catalogue).Select(x => x.Key).ToHashSet();
                    return Reasons(r, newType, catalogue).Where(x => !before.Contains(x.Key)).Select(x => x.Message);
                })
                .Distinct()
                .ToList();

        foreach (var widget in source.Widgets)
        {
            var breaks = Breaks(ColumnReferenceScanner.Scan(widget.ConfigJson, only, widget.Type));
            if (breaks.Count > 0) impact.Breaks.Add(WidgetUse(widget, breaks));
        }
        foreach (var filterJson in source.FilterJsons)
        {
            var breaks = Breaks(ColumnReferenceScanner.Scan(filterJson, only));
            if (breaks.Count > 0) impact.Breaks.Add(FilterUse(breaks));
        }
        return impact;
    }

    // --- what stops working on a type -------------------------------------

    private static IEnumerable<Reason> Reasons(
        ColumnReference reference,
        DatasetColumnType type,
        IReadOnlyDictionary<DatasetColumnType, IReadOnlyList<FilterOperatorDto>>? catalogue)
    {
        if (reference.NeedsNumber && type is not (DatasetColumnType.Int or DatasetColumnType.Double))
            yield return new Reason("needsNumber", $"{reference.Role} needs a number");

        if (reference.Condition is not { } condition) yield break;

        // An operator the stored condition names that isn't a known one isn't a type problem — leave it be.
        if (!Enum.TryParse<FilterOperator>(condition.Operator, ignoreCase: true, out var op)) yield break;

        var supported = FilterOperators.Find(type, op, catalogue);
        if (supported is null)
        {
            var label = Enum.GetValues<DatasetColumnType>()
                .Select(t => FilterOperators.Find(t, op, catalogue))
                .FirstOrDefault(o => o is not null)?.Label ?? op.ToString();
            yield return new Reason($"operator:{op}", $"Filter condition \"{label}\" can't be used on {TypeName(type)} columns");
            yield break;
        }

        if (supported.OperandKind != FilterOperandKind.List && condition.Values.Count < supported.OperandCount)
        {
            yield return new Reason($"operands:{op}", $"Filter condition \"{supported.Label}\" needs {supported.OperandCount} value(s)");
            yield break;
        }

        // Operands are stored as text and parsed against the column's type when the filter runs.
        foreach (var value in condition.Values.Take(Math.Max(supported.OperandCount, 0)))
        {
            var (kind, valid) = supported.OperandKind switch
            {
                FilterOperandKind.Number => ("number", CellValues.TryParseNumber(value, out _)),
                FilterOperandKind.Date => ("date", CellValues.TryParseDate(value, out _)),
                _ => ("", true),
            };
            if (!valid) yield return new Reason($"operand:{op}:{value}:{kind}", $"Filter condition value \"{value}\" isn't a {kind}");
        }
    }

    /// <summary>The type as the dataset editor names it.</summary>
    private static string TypeName(DatasetColumnType type) => type switch
    {
        DatasetColumnType.String => "text",
        DatasetColumnType.Int => "whole-number",
        DatasetColumnType.Double => "decimal",
        DatasetColumnType.Bool => "yes/no",
        DatasetColumnType.DateTime => "date",
        _ => type.ToString(),
    };

    // --- loading -----------------------------------------------------------

    private async Task<Source?> LoadAsync(int datasetId)
    {
        var dataset = await db.Datasets.AsNoTracking()
            .Where(d => d.Id == datasetId)
            .Select(d => new { d.Id, d.ReportRevisionId, Columns = d.Columns.Select(c => new { c.RefId, c.Type }).ToList() })
            .FirstOrDefaultAsync();
        if (dataset is null) return null;

        var widgets = await db.Widgets.AsNoTracking()
            .Where(w => w.Tab!.ReportRevisionId == dataset.ReportRevisionId)
            .OrderBy(w => w.Tab!.Order).ThenBy(w => w.Y).ThenBy(w => w.X)
            .Select(w => new ScanWidget(w.RefId, w.Type, w.ConfigJson, w.Tab!.Name))
            .ToListAsync();

        // Page-level filters are stored per dataset: [{ datasetId, filter }].
        var filtersJson = await db.ReportRevisions.AsNoTracking()
            .Where(r => r.Id == dataset.ReportRevisionId)
            .Select(r => r.FiltersJson)
            .FirstOrDefaultAsync();

        return new Source(
            dataset.Columns.ToDictionary(c => c.RefId, c => c.Type),
            widgets,
            ReportFiltersFor(filtersJson, datasetId).ToList());
    }

    private static ColumnUseDto WidgetUse(ScanWidget widget, List<string> roles) => new()
    {
        Kind = ColumnUseKind.Widget,
        WidgetId = widget.RefId,
        WidgetTitle = TitleOf(widget.ConfigJson),
        WidgetType = widget.Type,
        TabName = widget.TabName,
        Roles = roles,
    };

    private static ColumnUseDto FilterUse(List<string> roles) => new() { Kind = ColumnUseKind.ReportFilter, Roles = roles };

    /// <summary>The distinct roles, in first-seen order, each suffixed with a count when it occurs more than once.</summary>
    private static List<string> Roles(IEnumerable<string> roles) =>
        roles.GroupBy(r => r)
            .Select(g => g.Count() > 1 ? $"{g.Key} ×{g.Count()}" : g.Key)
            .ToList();

    /// <summary>The widget's own title from its config, or null when it has none.</summary>
    private static string? TitleOf(string configJson)
    {
        try
        {
            using var document = JsonDocument.Parse(configJson);
            foreach (var property in document.RootElement.EnumerateObject())
            {
                if (string.Equals(property.Name, "title", StringComparison.OrdinalIgnoreCase))
                    return property.Value.ValueKind == JsonValueKind.String ? property.Value.GetString() : null;
            }
        }
        catch (Exception ex) when (ex is JsonException or InvalidOperationException) { }
        return null;
    }

    /// <summary>The raw JSON of each page-level filter that applies to <paramref name="datasetId"/>.</summary>
    private static IEnumerable<string> ReportFiltersFor(string? filtersJson, int datasetId)
    {
        if (string.IsNullOrWhiteSpace(filtersJson)) yield break;

        JsonDocument document;
        try { document = JsonDocument.Parse(filtersJson); }
        catch (JsonException) { yield break; }

        using (document)
        {
            if (document.RootElement.ValueKind != JsonValueKind.Array) yield break;
            foreach (var entry in document.RootElement.EnumerateArray())
            {
                if (entry.ValueKind != JsonValueKind.Object) continue;
                var forThisDataset = false;
                string? filter = null;
                foreach (var property in entry.EnumerateObject())
                {
                    if (string.Equals(property.Name, "datasetId", StringComparison.OrdinalIgnoreCase)
                        && property.Value.ValueKind == JsonValueKind.Number
                        && property.Value.TryGetInt32(out var id))
                        forThisDataset = id == datasetId;
                    else if (string.Equals(property.Name, "filter", StringComparison.OrdinalIgnoreCase))
                        filter = property.Value.GetRawText();
                }
                if (forThisDataset && filter is not null) yield return filter;
            }
        }
    }
}
