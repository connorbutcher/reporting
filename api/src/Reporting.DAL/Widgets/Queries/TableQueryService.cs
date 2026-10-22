using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// A table widget's rows, filtered, sorted and paged server-side, with each requested column formatted per
/// its display configuration and classified against its tolerance band.
/// </summary>
public class TableQueryService(ReportingDbContext db, ToleranceResolver tolerance, DatasetResolver resolver)
{
    public const int MaxPageRows = 500;

    /// <summary>Caps a CSV export so a runaway dataset can't be pulled into memory wholesale.</summary>
    public const int MaxExportRows = 50_000;

    public Task<TableQueryResultDto?> QueryForTableAsync(int id, TableQueryDto dto)
    {
        return QueryAsync(id, dto, MaxPageRows);
    }

    public Task<TableQueryResultDto?> QueryForTableExportAsync(int id, TableQueryDto dto)
    {
        dto.Skip = 0;
        dto.Take = MaxExportRows;
        return QueryAsync(id, dto, MaxExportRows);
    }

    private async Task<TableQueryResultDto?> QueryAsync(int id, TableQueryDto dto, int maxTake)
    {
        var resolved = await resolver.ResolveAsync(id);
        if (resolved is null)
        {
            return null;
        }
        var dataset = resolved.Physical;
        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);
        var tolerances = await TableTolerances.ResolveAsync(tolerance, dto.Columns);
        var operatorCatalogue = await FilterOperators.LoadCatalogueAsync(db);

        var baseRows = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var all = FilterTranslator.Apply(baseRows, resolved.MandatoryFilter, columnsByRef, operatorCatalogue: operatorCatalogue);
        var predicate = FilterTranslator.Build(dto.Filter, columnsByRef, tolerances.Bounds, operatorCatalogue);
        var matching = predicate is null ? all : all.Where(predicate);

        var search = TableSearch.Predicate(dto.Search, dto.Columns, columnsByRef);
        if (search is not null)
        {
            matching = matching.Where(search);
        }
        if (dto.RowId is { } rowId)
        {
            matching = matching.Where(r => r.RefId == rowId);
        }
        var narrowed = predicate is not null || search is not null || dto.RowId is not null;

        var totalRowCount = await all.CountAsync();
        // Nothing narrowing means every row matches, so a second COUNT would only repeat the first.
        var matchedRowCount = narrowed ? await matching.CountAsync() : totalRowCount;

        var rows = await PageAsync(matching, dto, columnsByRef, maxTake);
        return new TableQueryResultDto
        {
            Id = resolved.Id,
            Name = resolved.Name,
            Rows = rows.Select(row => TableRows.Map(row, dto.Columns, columnsByRef, tolerances)).ToList(),
            TotalRowCount = totalRowCount,
            MatchedRowCount = matchedRowCount,
            Totals = await TableAggregates.TotalsAsync(matching, dto.Columns, columnsByRef),
            ColumnStats = await TableAggregates.ColumnStatsAsync(matching, dto.Columns, columnsByRef),
        };
    }

    private static Task<List<DatasetRow>> PageAsync(
        IQueryable<DatasetRow> matching, TableQueryDto dto, Dictionary<Guid, DatasetColumn> columnsByRef, int maxTake)
    {
        var sortColumn = dto.SortColumnId is { } sortId ? columnsByRef.GetValueOrDefault(sortId) : null;
        var ordered = TableSorting.Apply(matching, sortColumn, dto.SortDirection);
        var skip = Math.Max(0, dto.Skip);
        var take = Math.Clamp(dto.Take <= 0 ? 50 : dto.Take, 1, maxTake);
        return ordered.Skip(skip).Take(take).Include(r => r.Cells).AsNoTracking().ToListAsync();
    }
}
