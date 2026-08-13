using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;
using Reporting.DAL.Filtering;

namespace Reporting.DAL.Widgets;

/// <summary>Read models shaped for table and chart widgets: filtered, sorted, and pre-formatted server-side.</summary>
public class WidgetQueryRepository(ReportingDbContext db, ToleranceResolver tolerance)
{
    /// <summary>
    /// A page of rows shaped for a table widget: filtered and sorted server-side,
    /// with each requested column's value already formatted per its stored display
    /// configuration and classified against its tolerance band, if it has one.
    /// </summary>
    public async Task<TableQueryResultDto?> QueryForTableAsync(Guid id, TableQueryDto dto)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.RefId == id);
        if (dataset is null) return null;

        // Keyed by RefId: the client references columns by their stable RefId, and the translator
        // resolves each to the column's int id for cell comparisons.
        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);
        var predicate = FilterTranslator.Build(dto.Filter, columnsByRef);

        var all = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var matching = predicate is null ? all : all.Where(predicate);

        var totalRowCount = await all.CountAsync();
        var matchedRowCount = await matching.CountAsync();

        var sortColumn = dto.SortColumnId is { } sortId ? columnsByRef.GetValueOrDefault(sortId) : null;
        var ordered = ApplySort(matching, sortColumn, dto.SortDirection);

        var skip = Math.Max(0, dto.Skip);
        var take = Math.Clamp(dto.Take <= 0 ? 50 : dto.Take, 1, 500);
        var rows = await ordered.Skip(skip).Take(take).Include(r => r.Cells).ToListAsync();

        // Every distinct tolerance pointer among the requested columns, resolved in one batch.
        var pointers = dto.Columns
            .Where(c => c.Tolerance is not null)
            .Select(c => (
                Key: c.ColumnId,
                c.Tolerance!.SourceRowId,
                c.Tolerance.MinColumnId,
                c.Tolerance.MaxColumnId,
                c.Tolerance.ConcessionLowerColumnId,
                c.Tolerance.ConcessionUpperColumnId))
            .ToList();
        var bounds = await tolerance.ResolveAsync(pointers);

        var resultRows = rows.Select(row =>
        {
            var cells = new Dictionary<Guid, TableCellDto>();
            foreach (var setting in dto.Columns)
            {
                if (!columnsByRef.TryGetValue(setting.ColumnId, out var column)) continue;

                var cell = row.Cells.FirstOrDefault(c => c.ColumnId == column.Id);
                var configuration = JsonSerializer.Deserialize<JsonElement>(column.ConfigurationJson);
                var display = cell is null ? null : CellFormatter.Format(cell, column.Type, configuration);

                var status = ToleranceStatus.None;
                if (setting.Tolerance is not null
                    && cell?.NumberValue is { } value
                    && bounds.TryGetValue(setting.ColumnId, out var columnBounds))
                {
                    status = ToleranceResolver.Classify(value, columnBounds);
                }

                cells[setting.ColumnId] = new TableCellDto { DisplayValue = display, Tolerance = status };
            }
            return new TableRowResultDto { Id = row.RefId, Cells = cells };
        }).ToList();

        return new TableQueryResultDto
        {
            Id = dataset.RefId,
            Name = dataset.Name,
            Rows = resultRows,
            TotalRowCount = totalRowCount,
            MatchedRowCount = matchedRowCount
        };
    }

    /// <summary>Orders by the sort column's typed value, correlated per row the same way filters are.</summary>
    private static IQueryable<DatasetRow> ApplySort(
        IQueryable<DatasetRow> query,
        DatasetColumn? sortColumn,
        SortDirection direction)
    {
        if (sortColumn is null) return query;
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

    /// <summary>
    /// Rows shaped for a chart widget: filtered, grouped into series by the
    /// series column's value, paired with resolved tolerance bounds and
    /// pre-formatted tooltip lines — the client only builds the ECharts option.
    /// </summary>
    public async Task<ChartQueryResultDto?> QueryForChartAsync(Guid id, ChartQueryDto dto)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.RefId == id);
        if (dataset is null) return null;

        // Keyed by RefId (the client's reference); resolved to int ids for cell comparisons below.
        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);
        var predicate = FilterTranslator.Build(dto.Filter, columnsByRef);

        var all = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var matching = predicate is null ? all : all.Where(predicate);

        // Resolve the axis columns to their int ids; a missing column yields a sentinel that
        // matches no cell, so the chart is simply empty (as before).
        var xId = columnsByRef.GetValueOrDefault(dto.XColumnId)?.Id ?? 0;
        var yId = columnsByRef.GetValueOrDefault(dto.YColumnId)?.Id ?? 0;

        // Points need a real x and y; anything missing either is dropped, same
        // as the client's old Number.isFinite check.
        var plottable = matching.Where(r =>
            r.Cells.Any(c => c.ColumnId == xId && c.NumberValue != null) &&
            r.Cells.Any(c => c.ColumnId == yId && c.NumberValue != null));

        var rows = await plottable.Include(r => r.Cells).ToListAsync();

        var seriesColumn = dto.SeriesColumnId is { } seriesId ? columnsByRef.GetValueOrDefault(seriesId) : null;
        var tooltipColumns = dto.TooltipColumns
            .Select(tc => (Setting: tc, Column: columnsByRef.GetValueOrDefault(tc.ColumnId)))
            .Where(p => p.Column is not null)
            .ToList();

        var groups = new Dictionary<string, List<ChartPointDto>>();
        foreach (var row in rows)
        {
            var x = row.Cells.First(c => c.ColumnId == xId).NumberValue!.Value;
            var y = row.Cells.First(c => c.ColumnId == yId).NumberValue!.Value;

            var key = "";
            if (seriesColumn is not null)
            {
                var raw = row.Cells.FirstOrDefault(c => c.ColumnId == seriesColumn.Id)?.StringValue?.Trim();
                key = string.IsNullOrEmpty(raw) ? "(blank)" : raw;
            }

            var tooltipLines = new List<string>();
            foreach (var (setting, column) in tooltipColumns)
            {
                var cell = row.Cells.FirstOrDefault(c => c.ColumnId == column!.Id);
                if (cell is null) continue;

                var configuration = JsonSerializer.Deserialize<JsonElement>(column!.ConfigurationJson);
                var value = CellFormatter.Format(cell, column.Type, configuration);
                if (string.IsNullOrEmpty(value)) continue;

                tooltipLines.Add($"{setting.Prefix}{value}{setting.Suffix}");
            }

            var point = new ChartPointDto { X = x, Y = y, TooltipLines = tooltipLines };
            if (groups.TryGetValue(key, out var points)) points.Add(point);
            else groups[key] = [point];
        }

        var pointers = dto.ToleranceBands
            .Where(b => b.SourceRowId != Guid.Empty && b.MinColumnId != Guid.Empty && b.MaxColumnId != Guid.Empty)
            .Select(b => (
                Key: b.Id,
                b.SourceRowId,
                b.MinColumnId,
                b.MaxColumnId,
                b.ConcessionLowerColumnId,
                b.ConcessionUpperColumnId))
            .ToList();
        var bounds = await tolerance.ResolveAsync(pointers);

        var resolvedBands = dto.ToleranceBands.Select(b =>
        {
            bounds.TryGetValue(b.Id, out var bound);
            return new ResolvedToleranceBandDto
            {
                Id = b.Id,
                Axis = b.Axis,
                Min = bound?.Min,
                Max = bound?.Max,
                ConcessionLower = bound?.ConcessionLower,
                ConcessionUpper = bound?.ConcessionUpper
            };
        }).ToList();

        return new ChartQueryResultDto
        {
            Id = dataset.RefId,
            Name = dataset.Name,
            // Sorted by X so a line series draws left-to-right instead of zig-zagging; harmless no-op for scatter.
            Series = groups.Select(g => new ChartSeriesDto { Label = g.Key, Points = g.Value.OrderBy(p => p.X).ToList() }).ToList(),
            ToleranceBands = resolvedBands
        };
    }
}
