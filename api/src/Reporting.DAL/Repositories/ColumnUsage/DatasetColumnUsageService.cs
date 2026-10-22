using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// Where a dataset's columns are used across its revision (widgets, page filters and filtered datasets), so
/// removing a column or changing its type can show what it would break.
/// </summary>
public class DatasetColumnUsageService(ReportingDbContext db)
{
    private const string FilterRole = "Filter condition";

    private readonly ColumnUsageLoader _loader = new(db);

    /// <summary>Every use of each column; unused columns don't appear.</summary>
    public async Task<DatasetColumnUsageDto?> GetAsync(int datasetId)
    {
        var source = await _loader.LoadAsync(datasetId);
        if (source is null)
        {
            return null;
        }

        var columnIds = source.ColumnTypes.Keys.ToHashSet();
        var uses = new Dictionary<Guid, List<ColumnUseDto>>();

        foreach (var widget in source.Widgets)
        {
            foreach (var byColumn in ColumnReferenceScanner.Scan(widget.ConfigJson, columnIds, widget.Type).GroupBy(r => r.ColumnId))
            {
                AddUse(uses, byColumn.Key, ColumnUses.Widget(widget, ColumnUses.Roles(byColumn.Select(r => r.Role))));
            }
        }

        foreach (var filterJson in source.FilterJsons)
        {
            foreach (var byColumn in ColumnReferenceScanner.Scan(filterJson, columnIds).GroupBy(r => r.ColumnId))
            {
                AddUse(uses, byColumn.Key, ColumnUses.ReportFilter(ColumnUses.Roles(byColumn.Select(_ => FilterRole))));
            }
        }

        foreach (var filtered in source.FilteredDatasets)
        {
            foreach (var byColumn in ColumnReferenceScanner.Scan(filtered.FilterJson, columnIds).GroupBy(r => r.ColumnId))
            {
                AddUse(uses, byColumn.Key, ColumnUses.FilteredDataset(filtered.Name, ColumnUses.Roles(byColumn.Select(_ => FilterRole))));
            }
        }

        return new DatasetColumnUsageDto
        {
            Columns = uses.Select(u => new ColumnUsageDto { ColumnId = u.Key, Uses = u.Value }).ToList(),
        };
    }

    /// <summary>What changing the column to <paramref name="newType"/> would newly break. Null when the dataset or column doesn't exist.</summary>
    public async Task<ColumnTypeImpactDto?> GetTypeChangeImpactAsync(int datasetId, Guid columnId, DatasetColumnType newType)
    {
        var source = await _loader.LoadAsync(datasetId);
        if (source is null || !source.ColumnTypes.TryGetValue(columnId, out var oldType))
        {
            return null;
        }

        var impact = new ColumnTypeImpactDto { From = oldType, To = newType };
        if (oldType == newType)
        {
            return impact;
        }

        // An empty catalogue table (a fresh test database) means the built-in defaults, not "no operators".
        var loaded = await FilterOperators.LoadCatalogueAsync(db);
        var breaks = new TypeChangeBreaks(oldType, newType, loaded.Count == 0 ? null : loaded);
        var only = new HashSet<Guid> { columnId };

        foreach (var widget in source.Widgets)
        {
            AddBreaks(impact, breaks.For(ColumnReferenceScanner.Scan(widget.ConfigJson, only, widget.Type)), roles => ColumnUses.Widget(widget, roles));
        }
        foreach (var filterJson in source.FilterJsons)
        {
            AddBreaks(impact, breaks.For(ColumnReferenceScanner.Scan(filterJson, only)), ColumnUses.ReportFilter);
        }
        foreach (var filtered in source.FilteredDatasets)
        {
            AddBreaks(impact, breaks.For(ColumnReferenceScanner.Scan(filtered.FilterJson, only)), roles => ColumnUses.FilteredDataset(filtered.Name, roles));
        }
        return impact;
    }

    private static void AddUse(Dictionary<Guid, List<ColumnUseDto>> uses, Guid columnId, ColumnUseDto use)
    {
        if (!uses.TryGetValue(columnId, out var list))
        {
            uses[columnId] = list = new List<ColumnUseDto>();
        }
        list.Add(use);
    }

    private static void AddBreaks(ColumnTypeImpactDto impact, List<string> breaks, Func<List<string>, ColumnUseDto> toUse)
    {
        if (breaks.Count > 0)
        {
            impact.Breaks.Add(toUse(breaks));
        }
    }
}
