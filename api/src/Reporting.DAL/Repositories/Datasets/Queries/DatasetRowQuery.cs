using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;
using Reporting.DAL.Filtering;

namespace Reporting.DAL.Repositories;

/// <summary>Filtered row reads over a resolved dataset, for the generic query and the filter panel.</summary>
internal sealed class DatasetRowQuery(ReportingDbContext db, DatasetResolver resolver)
{
    /// <summary>
    /// Filtered in SQL. Throws <see cref="FilterException"/> for a filter that doesn't match the schema;
    /// null means the dataset wasn't found.
    /// </summary>
    public async Task<DatasetQueryResultDto?> QueryAsync(int id, FilterGroupDto? filter)
    {
        var resolved = await resolver.ResolveAsync(id);
        if (resolved is null)
        {
            return null;
        }

        var filtered = await FilterRowsAsync(resolved, filter);
        var rows = await filtered.Matching.Include(r => r.Cells).ToListAsync();
        var columnRefById = resolved.Physical.Columns.ToDictionary(c => c.Id, c => c.RefId);

        return new DatasetQueryResultDto
        {
            Id = resolved.Id,
            Name = resolved.Name,
            Rows = rows.Select(r => r.ToDto(columnRefById)).ToList(),
            TotalRowCount = await filtered.All.CountAsync(),
            MatchedRowCount = rows.Count
        };
    }

    /// <summary>Counted in SQL without loading rows, so the filter panel can run it on every edit. Same errors as <see cref="QueryAsync"/>.</summary>
    public async Task<DatasetCountResultDto?> CountAsync(int id, FilterGroupDto? filter)
    {
        var resolved = await resolver.ResolveAsync(id);
        if (resolved is null)
        {
            return null;
        }

        var filtered = await FilterRowsAsync(resolved, filter);
        return new DatasetCountResultDto
        {
            TotalRowCount = await filtered.All.CountAsync(),
            MatchedRowCount = await filtered.Matching.CountAsync()
        };
    }

    /// <summary>
    /// A column's distinct non-empty values for the filter value dropdowns, ordered and capped, optionally
    /// narrowed by <paramref name="search"/>. Null when the column doesn't exist, empty when it has no values.
    /// </summary>
    public async Task<List<string>?> ColumnValuesAsync(int id, Guid columnId, string? search, int limit)
    {
        var resolved = await resolver.ResolveAsync(id);
        var column = resolved?.Physical.Columns.FirstOrDefault(c => c.RefId == columnId);
        if (column is null)
        {
            return null;
        }

        // Cells by ColumnId need no join back to rows, and ride the filtered (ColumnId, StringValue)
        // index as an ordered range scan that also satisfies DISTINCT and ORDER BY.
        var cells = db.DatasetCells
            .Where(c => c.ColumnId == column.Id && c.StringValue != null && c.StringValue != "");

        if (!string.IsNullOrWhiteSpace(search))
        {
            cells = cells.Where(c => c.StringValue!.Contains(search));
        }

        return await cells
            .Select(c => c.StringValue!)
            .Distinct()
            .OrderBy(v => v)
            .Take(Math.Clamp(limit, 1, 500))
            .ToListAsync();
    }

    /// <summary>Columns are referenced by RefId in filters and resolved to int ids for the cell comparison.</summary>
    private async Task<FilteredRows> FilterRowsAsync(ResolvedDataset resolved, FilterGroupDto? filter)
    {
        var physical = resolved.Physical;
        var columnsByRef = physical.Columns.ToDictionary(c => c.RefId);
        var operatorCatalogue = await FilterOperators.LoadCatalogueAsync(db);
        var baseRows = db.DatasetRows.Where(r => r.DatasetId == physical.Id);
        var all = FilterTranslator.Apply(baseRows, resolved.MandatoryFilter, columnsByRef, operatorCatalogue: operatorCatalogue);
        var matching = FilterTranslator.Apply(all, filter, columnsByRef, operatorCatalogue: operatorCatalogue);
        return new FilteredRows(all, matching);
    }
}
