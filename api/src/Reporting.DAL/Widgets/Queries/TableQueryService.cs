using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Read model shaped for a table widget: filtered, sorted, and paged server-side, with each
/// requested column's value already formatted per its stored display configuration and
/// classified against its tolerance band, if it has one.
/// </summary>
public class TableQueryService(ReportingDbContext db, ToleranceResolver tolerance, DatasetResolver resolver)
{
    /// <summary>The most rows one on-screen page or scroll window can ask for.</summary>
    public const int MaxPageRows = 500;

    /// <summary>The most rows a CSV export pulls in one go, so a runaway dataset can't be dragged into memory wholesale.</summary>
    public const int MaxExportRows = 50_000;

    public Task<TableQueryResultDto?> QueryForTableAsync(int id, TableQueryDto dto) =>
        QueryAsync(id, dto, MaxPageRows);

    /// <summary>Every matched row (up to <see cref="MaxExportRows"/>) from the start, for a CSV export of the whole table.</summary>
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

        // Keyed by RefId: the client references columns by their stable RefId, and the translator
        // resolves each to the column's int id for cell comparisons.
        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);

        // Every distinct tolerance pointer among the requested columns, resolved in one batch —
        // used both to band the returned cells and to evaluate any tolerance filter operators,
        // which reuse the column's banding. Keyed by the column RefId the filter also addresses.
        var pointers = dto.Columns
            .Where(c => c.Tolerance is { SourceRowId: not null, Match: null })
            .Select(c => (
                Key: c.ColumnId,
                c.Tolerance!.SourceDatasetId,
                SourceRowId: c.Tolerance.SourceRowId!.Value,
                c.Tolerance.MinColumnId,
                c.Tolerance.MaxColumnId,
                c.Tolerance.ConcessionLowerColumnId,
                c.Tolerance.ConcessionUpperColumnId))
            .ToList();
        var bounds = await tolerance.ResolveAsync(pointers);

        // Columns that opted in to matching pick their limits per row, so they resolve to a table of
        // limits by identifier rather than one set of bounds. The tolerance filter operators need a
        // single band, so they (which read only `bounds`) don't apply to these columns.
        var matchSpecs = dto.Columns
            .Where(c => c.Tolerance is { Match: not null })
            .Select(c => (
                Key: c.ColumnId,
                c.Tolerance!.SourceDatasetId,
                MatchColumnId: c.Tolerance.Match!.SourceColumnId,
                c.Tolerance.MinColumnId,
                c.Tolerance.MaxColumnId,
                c.Tolerance.ConcessionLowerColumnId,
                c.Tolerance.ConcessionUpperColumnId))
            .ToList();
        var matchedLimits = await tolerance.ResolveMatchedAsync(matchSpecs);

        var operatorCatalogue = await FilterOperators.LoadCatalogueAsync(db);

        var baseRows = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var all = FilterTranslator.Apply(baseRows, resolved.MandatoryFilter, columnsByRef, operatorCatalogue: operatorCatalogue);
        var predicate = FilterTranslator.Build(dto.Filter, columnsByRef, bounds, operatorCatalogue);
        var matching = predicate is null ? all : all.Where(predicate);

        var search = SearchPredicate(dto.Search, dto.Columns, columnsByRef);
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
        // With nothing narrowing the rows every row matches, so the second COUNT would just repeat the first.
        var matchedRowCount = narrowed ? await matching.CountAsync() : totalRowCount;

        var sortColumn = dto.SortColumnId is { } sortId ? columnsByRef.GetValueOrDefault(sortId) : null;
        var ordered = ApplySort(matching, sortColumn, dto.SortDirection);

        var skip = Math.Max(0, dto.Skip);
        var take = Math.Clamp(dto.Take <= 0 ? 50 : dto.Take, 1, maxTake);
        // Read-only projection to DTOs below, so skip change tracking on the materialised rows/cells.
        var rows = await ordered.Skip(skip).Take(take).Include(r => r.Cells).AsNoTracking().ToListAsync();

        var resultRows = rows
            .Select(row => MapRow(row, dto.Columns, columnsByRef, bounds, matchedLimits))
            .ToList();

        return new TableQueryResultDto
        {
            Id = resolved.Id,
            Name = resolved.Name,
            Rows = resultRows,
            TotalRowCount = totalRowCount,
            MatchedRowCount = matchedRowCount,
            Totals = await TotalsAsync(matching, dto.Columns, columnsByRef),
            ColumnStats = await ColumnStatsAsync(matching, dto.Columns, columnsByRef),
        };
    }

    /// <summary>
    /// Rows where any requested column's stored text contains <paramref name="search"/>. Every cell keeps
    /// its canonical text in <see cref="DatasetCell.StringValue"/>, so this reaches numbers and dates too.
    /// </summary>
    private static Expression<Func<DatasetRow, bool>>? SearchPredicate(
        string? search,
        List<DataTableColumnSetting> settings,
        Dictionary<Guid, DatasetColumn> columnsByRef)
    {
        var text = search?.Trim();
        if (string.IsNullOrEmpty(text))
        {
            return null;
        }

        var ids = settings
            .Select(s => columnsByRef.GetValueOrDefault(s.ColumnId)?.Id)
            .OfType<int>()
            .ToList();
        if (ids.Count == 0)
        {
            return null;
        }

        var pattern = $"%{text.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_")}%";
        return r => r.Cells.Any(c => ids.Contains(c.ColumnId) && c.StringValue != null && EF.Functions.Like(c.StringValue, pattern, "\\"));
    }

    /// <summary>Each column's configured total, reduced over every matched row (not only the returned page).</summary>
    private static async Task<Dictionary<Guid, TableCellDto>> TotalsAsync(
        IQueryable<DatasetRow> matching,
        List<DataTableColumnSetting> settings,
        Dictionary<Guid, DatasetColumn> columnsByRef)
    {
        var totals = new Dictionary<Guid, TableCellDto>();
        foreach (var setting in settings)
        {
            if (setting.Total is not { } aggregate || !columnsByRef.TryGetValue(setting.ColumnId, out var column))
            {
                continue;
            }

            var columnId = column.Id;
            var cells = matching.SelectMany(r => r.Cells).Where(c => c.ColumnId == columnId);
            double? value;
            if (aggregate == Aggregate.Count)
            {
                // Count works on any column: the matched rows that have a value in it.
                value = await cells.CountAsync(c => c.StringValue != null && c.StringValue != "");
            }
            else if (column.Type is DatasetColumnType.Int or DatasetColumnType.Double)
            {
                var numbers = cells.Where(c => c.NumberValue != null).Select(c => c.NumberValue!.Value);
                value = await numbers.AnyAsync()
                    ? aggregate switch
                    {
                        Aggregate.Sum => await numbers.SumAsync(),
                        Aggregate.Average => await numbers.AverageAsync(),
                        Aggregate.Min => await numbers.MinAsync(),
                        Aggregate.Max => await numbers.MaxAsync(),
                        _ => null,
                    }
                    : null;
            }
            else
            {
                continue; // Sums and averages only mean something for numbers.
            }

            // A count is a plain tally; the other aggregates read in the column's own number format.
            var config = aggregate == Aggregate.Count ? null : column.GetConfig() as NumericColumnConfig;
            totals[setting.ColumnId] = new TableCellDto
            {
                Value = value,
                DisplayValue = value is { } v ? CellFormatter.Number(v, config) : null,
            };
        }
        return totals;
    }

    /// <summary>The numeric range of each data-bar column over every matched row, so bars scale the same on every page.</summary>
    private static async Task<Dictionary<Guid, TableColumnStatsDto>> ColumnStatsAsync(
        IQueryable<DatasetRow> matching,
        List<DataTableColumnSetting> settings,
        Dictionary<Guid, DatasetColumn> columnsByRef)
    {
        var stats = new Dictionary<Guid, TableColumnStatsDto>();
        foreach (var setting in settings)
        {
            if (!setting.DataBars
                || !columnsByRef.TryGetValue(setting.ColumnId, out var column)
                || column.Type is not (DatasetColumnType.Int or DatasetColumnType.Double))
            {
                continue;
            }

            var columnId = column.Id;
            var numbers = matching.SelectMany(r => r.Cells)
                .Where(c => c.ColumnId == columnId && c.NumberValue != null)
                .Select(c => c.NumberValue);
            stats[setting.ColumnId] = new TableColumnStatsDto
            {
                Min = await numbers.MinAsync(),
                Max = await numbers.MaxAsync(),
            };
        }
        return stats;
    }

    /// <summary>One row's result: a formatted, tolerance-classified cell per requested column.</summary>
    private static TableRowResultDto MapRow(
        DatasetRow row,
        List<DataTableColumnSetting> settings,
        Dictionary<Guid, DatasetColumn> columnsByRef,
        Dictionary<Guid, ToleranceBounds?> bounds,
        Dictionary<Guid, MatchedLimits> matchedLimits)
    {
        var cells = new Dictionary<Guid, TableCellDto>();
        foreach (var setting in settings)
        {
            if (!columnsByRef.TryGetValue(setting.ColumnId, out var column))
            {
                continue;
            }

            cells[setting.ColumnId] = BuildCell(row, setting, column, columnsByRef, bounds, matchedLimits);
        }
        return new TableRowResultDto { Id = row.RefId, Cells = cells };
    }

    /// <summary>One column's formatted display value and, when it opted in, its tolerance verdict.</summary>
    private static TableCellDto BuildCell(
        DatasetRow row,
        DataTableColumnSetting setting,
        DatasetColumn column,
        Dictionary<Guid, DatasetColumn> columnsByRef,
        Dictionary<Guid, ToleranceBounds?> bounds,
        Dictionary<Guid, MatchedLimits> matchedLimits)
    {
        var cell = row.Cells.FirstOrDefault(c => c.ColumnId == column.Id);
        var display = cell is null ? null : CellFormatter.Format(cell, column.Type, column.GetConfig());

        var status = ToleranceStatus.None;
        if (setting.Tolerance is not null && cell?.NumberValue is { } value)
        {
            var columnBounds = ResolveColumnBounds(row, setting, columnsByRef, bounds, matchedLimits);
            status = ToleranceResolver.Classify(value, columnBounds);
        }

        return new TableCellDto { DisplayValue = display, Value = TypedValue(cell, column.Type), Tolerance = status };
    }

    /// <summary>A cell's value in its column's own type, falling back to the stored text where it didn't parse.</summary>
    private static object? TypedValue(DatasetCell? cell, DatasetColumnType type)
    {
        if (cell is null)
        {
            return null;
        }
        object? typed = type switch
        {
            DatasetColumnType.Int or DatasetColumnType.Double => cell.NumberValue,
            DatasetColumnType.DateTime => cell.DateValue,
            DatasetColumnType.Bool => cell.BoolValue,
            _ => null,
        };
        return typed ?? (string.IsNullOrEmpty(cell.StringValue) ? null : cell.StringValue);
    }

    /// <summary>The tolerance bounds a cell is classified against: a per-row limits lookup for a
    /// matching column, else the column's single fixed-row band.</summary>
    private static ToleranceBounds? ResolveColumnBounds(
        DatasetRow row,
        DataTableColumnSetting setting,
        Dictionary<Guid, DatasetColumn> columnsByRef,
        Dictionary<Guid, ToleranceBounds?> bounds,
        Dictionary<Guid, MatchedLimits> matchedLimits)
    {
        if (setting.Tolerance?.Match is { } match)
        {
            // This row's limits row is the one whose identifier equals the row's own value.
            if (matchedLimits.TryGetValue(setting.ColumnId, out var limits)
                && columnsByRef.TryGetValue(match.ColumnId, out var keyColumn))
            {
                return limits.For(row.Cells.FirstOrDefault(c => c.ColumnId == keyColumn.Id));
            }
            return null;
        }

        bounds.TryGetValue(setting.ColumnId, out var columnBounds);
        return columnBounds;
    }

    /// <summary>
    /// Orders by the sort column's typed value, with the row id as the tiebreak. Paging needs a total
    /// order: without one the database may return tied (or, unsorted, all) rows in a different order
    /// per query, repeating or skipping rows across pages. The sort column's cells are joined to their
    /// rows once rather than looked up per row, so a deep page of a large dataset stays cheap; a row
    /// with no cell in the column sorts as null, as before.
    /// </summary>
    private static IQueryable<DatasetRow> ApplySort(
        IQueryable<DatasetRow> query,
        DatasetColumn? sortColumn,
        SortDirection direction)
    {
        if (sortColumn is null)
        {
            return query.OrderBy(r => r.Id);
        }

        var sortId = sortColumn.Id;
        var joined = query.SelectMany(
            r => r.Cells.Where(c => c.ColumnId == sortId).DefaultIfEmpty(),
            (r, c) => new SortedRow { Row = r, Cell = c });
        var desc = direction == SortDirection.Desc;

        var ordered = sortColumn.Type switch
        {
            DatasetColumnType.Int or DatasetColumnType.Double => desc
                ? joined.OrderByDescending(x => x.Cell!.NumberValue)
                : joined.OrderBy(x => x.Cell!.NumberValue),
            DatasetColumnType.DateTime => desc
                ? joined.OrderByDescending(x => x.Cell!.DateValue)
                : joined.OrderBy(x => x.Cell!.DateValue),
            DatasetColumnType.Bool => desc
                ? joined.OrderByDescending(x => x.Cell!.BoolValue)
                : joined.OrderBy(x => x.Cell!.BoolValue),
            _ => desc
                ? joined.OrderByDescending(x => x.Cell!.StringValue)
                : joined.OrderBy(x => x.Cell!.StringValue)
        };
        return ordered.ThenBy(x => x.Row.Id).Select(x => x.Row);
    }
}
