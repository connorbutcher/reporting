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
    public async Task<TableQueryResultDto?> QueryForTableAsync(int id, TableQueryDto dto)
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

        var totalRowCount = await all.CountAsync();
        // With no filter every row matches, so the second COUNT would just repeat the first.
        var matchedRowCount = predicate is null ? totalRowCount : await matching.CountAsync();

        var sortColumn = dto.SortColumnId is { } sortId ? columnsByRef.GetValueOrDefault(sortId) : null;
        var ordered = ApplySort(matching, sortColumn, dto.SortDirection);

        var skip = Math.Max(0, dto.Skip);
        var take = Math.Clamp(dto.Take <= 0 ? 50 : dto.Take, 1, 500);
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
            MatchedRowCount = matchedRowCount
        };
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

        return new TableCellDto { DisplayValue = display, Tolerance = status };
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

    /// <summary>Orders by the sort column's typed value, correlated per row the same way filters are.</summary>
    private static IQueryable<DatasetRow> ApplySort(
        IQueryable<DatasetRow> query,
        DatasetColumn? sortColumn,
        SortDirection direction)
    {
        if (sortColumn is null)
        {
            return query;
        }
        var desc = direction == SortDirection.Desc;
        var sortId = sortColumn.Id;

        return sortColumn.Type switch
        {
            DatasetColumnType.Int or DatasetColumnType.Double => desc
                ? query.OrderByDescending(r => r.Cells.FirstOrDefault(c => c.ColumnId == sortId)!.NumberValue)
                : query.OrderBy(r => r.Cells.FirstOrDefault(c => c.ColumnId == sortId)!.NumberValue),
            DatasetColumnType.DateTime => desc
                ? query.OrderByDescending(r => r.Cells.FirstOrDefault(c => c.ColumnId == sortId)!.DateValue)
                : query.OrderBy(r => r.Cells.FirstOrDefault(c => c.ColumnId == sortId)!.DateValue),
            DatasetColumnType.Bool => desc
                ? query.OrderByDescending(r => r.Cells.FirstOrDefault(c => c.ColumnId == sortId)!.BoolValue)
                : query.OrderBy(r => r.Cells.FirstOrDefault(c => c.ColumnId == sortId)!.BoolValue),
            _ => desc
                ? query.OrderByDescending(r => r.Cells.FirstOrDefault(c => c.ColumnId == sortId)!.StringValue)
                : query.OrderBy(r => r.Cells.FirstOrDefault(c => c.ColumnId == sortId)!.StringValue)
        };
    }
}
