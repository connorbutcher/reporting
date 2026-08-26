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
    public async Task<TableQueryResultDto?> QueryForTableAsync(int id, TableQueryDto dto)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
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
                c.Tolerance!.SourceDatasetId,
                c.Tolerance.SourceRowId,
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
            Id = dataset.Id,
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
    public async Task<ChartQueryResultDto?> QueryForChartAsync(int id, ChartQueryDto dto)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        // Keyed by RefId (the client's reference); resolved to int ids for cell comparisons below.
        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);
        var predicate = FilterTranslator.Build(dto.Filter, columnsByRef);

        var all = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var matching = predicate is null ? all : all.Where(predicate);

        // Resolve the axis columns; a missing column yields a sentinel id that matches no cell,
        // so the chart is simply empty (as before). An axis is a number for a numeric column and
        // a category label for a text one.
        var xColumn = columnsByRef.GetValueOrDefault(dto.XColumnId);
        var yColumn = columnsByRef.GetValueOrDefault(dto.YColumnId);
        var xId = xColumn?.Id ?? 0;
        var yId = yColumn?.Id ?? 0;
        var xText = xColumn?.Type == DatasetColumnType.String;
        var yText = yColumn?.Type == DatasetColumnType.String;

        // Points need a real value on each axis — a number for a numeric axis, a string for a text
        // one; anything missing either is dropped. Filtered per axis type so the predicate stays
        // EF-translatable rather than branching per row.
        var plottable = xText
            ? matching.Where(r => r.Cells.Any(c => c.ColumnId == xId && c.StringValue != null))
            : matching.Where(r => r.Cells.Any(c => c.ColumnId == xId && c.NumberValue != null));
        plottable = yText
            ? plottable.Where(r => r.Cells.Any(c => c.ColumnId == yId && c.StringValue != null))
            : plottable.Where(r => r.Cells.Any(c => c.ColumnId == yId && c.NumberValue != null));

        var rows = await plottable.Include(r => r.Cells).ToListAsync();

        var seriesColumn = dto.SeriesColumnId is { } seriesId ? columnsByRef.GetValueOrDefault(seriesId) : null;
        var tooltipColumns = dto.TooltipColumns
            .Select(tc => (Setting: tc, Column: columnsByRef.GetValueOrDefault(tc.ColumnId)))
            .Where(p => p.Column is not null)
            .ToList();

        var groups = new Dictionary<string, List<ChartPointDto>>();
        foreach (var row in rows)
        {
            var xCell = row.Cells.First(c => c.ColumnId == xId);
            var yCell = row.Cells.First(c => c.ColumnId == yId);
            object x = xText ? xCell.StringValue!.Trim() : xCell.NumberValue!.Value;
            object y = yText ? yCell.StringValue!.Trim() : yCell.NumberValue!.Value;

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
            .Where(b => b.SourceDatasetId != 0 && b.SourceRowId != Guid.Empty && b.MinColumnId != Guid.Empty && b.MaxColumnId != Guid.Empty)
            .Select(b => (
                Key: b.Id,
                b.SourceDatasetId,
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
            Id = dataset.Id,
            Name = dataset.Name,
            // Sorted by X so a line series draws left-to-right instead of zig-zagging; harmless no-op
            // for scatter. A text X orders alphabetically, matching the category axis the client builds.
            Series = groups.Select(g => new ChartSeriesDto
            {
                Label = g.Key,
                Points = (xText
                    ? g.Value.OrderBy(p => (string)p.X)
                    : g.Value.OrderBy(p => (double)p.X)).ToList()
            }).ToList(),
            ToleranceBands = resolvedBands
        };
    }

    /// <summary>
    /// Rows shaped for a bar chart: filtered, then grouped by the category column
    /// and reduced to one value per category (per series) by the chosen aggregate.
    /// Unlike scatter/line this returns categories plus a value-per-category array
    /// for each series, already aligned so the client can drop them straight onto a
    /// category axis. The grouping and reduction run as a single SQL GROUP BY, so
    /// only the aggregated rows (one per category/series) come back rather than every
    /// underlying row.
    /// </summary>
    public async Task<BarChartQueryResultDto?> QueryForBarChartAsync(int id, BarChartQueryDto dto)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        var empty = new BarChartQueryResultDto { Id = dataset.Id, Name = dataset.Name };

        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);
        var predicate = FilterTranslator.Build(dto.Filter, columnsByRef);

        var all = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var matching = predicate is null ? all : all.Where(predicate);

        // A missing category (nothing bound yet) yields an empty chart, the same graceful
        // no-op scatter/line give when their axes aren't set.
        var categoryColumn = columnsByRef.GetValueOrDefault(dto.CategoryColumnId);
        if (categoryColumn is null) return empty;
        var categoryId = categoryColumn.Id;

        var isCount = dto.Aggregate == Aggregate.Count;
        var valueColumn = dto.ValueColumnId is { } vId ? columnsByRef.GetValueOrDefault(vId) : null;
        var valueId = valueColumn?.Id ?? 0;
        // Every aggregate but Count needs a numeric measure to reduce; without one there's nothing to plot.
        if (!isCount && valueColumn is null) return empty;

        // A sentinel id matches no cell, so with no series column every row falls into one
        // group whose key is "" — the single unlabelled series the client expects.
        var seriesColumn = dto.SeriesColumnId is { } sId ? columnsByRef.GetValueOrDefault(sId) : null;
        var seriesId = seriesColumn?.Id ?? 0;

        // Non-count aggregates reduce only rows that carry a numeric measure; a category with
        // none simply doesn't appear (SUM/MIN/MAX/AVG have nothing to reduce there).
        var rowsQuery = isCount
            ? matching
            : matching.Where(r => r.Cells.Any(c => c.ColumnId == valueId && c.NumberValue != null));

        // One scalar row per dataset row — its category, a typed sort key, its series, and its
        // measure — pivoted out of the cell table so the group-by below is a plain GROUP BY.
        // Category null/"" collapse to "" here (COALESCE) so they group as one blank bar; the
        // series is trimmed to match, and both are turned into display labels after grouping.
        var projected = rowsQuery.Select(r => new BarProjection
        {
            Category = r.Cells.Where(c => c.ColumnId == categoryId).Select(c => c.StringValue).FirstOrDefault() ?? "",
            SortNumber = r.Cells.Where(c => c.ColumnId == categoryId).Select(c => c.NumberValue).FirstOrDefault(),
            SortDate = r.Cells.Where(c => c.ColumnId == categoryId).Select(c => c.DateValue).FirstOrDefault(),
            Series = (r.Cells.Where(c => c.ColumnId == seriesId).Select(c => c.StringValue).FirstOrDefault() ?? "").Trim(),
            Value = r.Cells.Where(c => c.ColumnId == valueId).Select(c => c.NumberValue).FirstOrDefault()
        });

        var grouped = projected.GroupBy(x => new { x.Category, x.Series });

        // Each aggregate is a different SQL reducer, so the whole GROUP BY is built per kind.
        // The min sort keys are constant within a category, so MIN just carries them through.
        IQueryable<BarGroup> query = dto.Aggregate switch
        {
            Aggregate.Count => grouped.Select(g => new BarGroup
            {
                Category = g.Key.Category, Series = g.Key.Series,
                SortNumber = g.Min(x => x.SortNumber), SortDate = g.Min(x => x.SortDate),
                Value = g.Count()
            }),
            Aggregate.Sum => grouped.Select(g => new BarGroup
            {
                Category = g.Key.Category, Series = g.Key.Series,
                SortNumber = g.Min(x => x.SortNumber), SortDate = g.Min(x => x.SortDate),
                Value = g.Sum(x => x.Value)
            }),
            Aggregate.Average => grouped.Select(g => new BarGroup
            {
                Category = g.Key.Category, Series = g.Key.Series,
                SortNumber = g.Min(x => x.SortNumber), SortDate = g.Min(x => x.SortDate),
                Value = g.Average(x => x.Value)
            }),
            Aggregate.Min => grouped.Select(g => new BarGroup
            {
                Category = g.Key.Category, Series = g.Key.Series,
                SortNumber = g.Min(x => x.SortNumber), SortDate = g.Min(x => x.SortDate),
                Value = g.Min(x => x.Value)
            }),
            Aggregate.Max => grouped.Select(g => new BarGroup
            {
                Category = g.Key.Category, Series = g.Key.Series,
                SortNumber = g.Min(x => x.SortNumber), SortDate = g.Min(x => x.SortDate),
                Value = g.Max(x => x.Value)
            }),
            _ => throw new FilterException($"Unsupported aggregate '{dto.Aggregate}'.")
        };

        var groups = await query.ToListAsync();

        // Order categories once: numerically/chronologically for numeric and date columns
        // (blanks, whose sort key is null, sink to the end), alphabetically otherwise.
        var numeric = categoryColumn.Type is DatasetColumnType.Int or DatasetColumnType.Double;
        var date = categoryColumn.Type is DatasetColumnType.DateTime;
        var byCategory = groups
            .GroupBy(g => g.Category)
            .Select(g => new
            {
                Category = g.Key,
                Sort = numeric ? g.Min(x => x.SortNumber)
                    : date ? g.Min(x => x.SortDate)?.Ticks
                    : null
            });
        var orderedCategoryKeys = (numeric || date)
            ? byCategory.OrderBy(c => c.Sort ?? double.MaxValue).Select(c => c.Category).ToList()
            : byCategory.Select(c => c.Category).OrderBy(k => k, StringComparer.OrdinalIgnoreCase).ToList();

        var orderedSeriesKeys = groups
            .Select(g => g.Series)
            .Distinct()
            .OrderBy(s => s, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var valueByKey = groups.ToDictionary(g => (g.Category, g.Series), g => g.Value);

        // With no series column every group's key is "" — one series carrying the empty label
        // the client reads as "no series". Otherwise a blank key shows as "(blank)".
        string SeriesLabel(string key) => seriesColumn is null ? "" : (key.Length == 0 ? "(blank)" : key);

        var series = orderedSeriesKeys.Select(seriesKey => new BarSeriesDto
        {
            Label = SeriesLabel(seriesKey),
            Values = orderedCategoryKeys
                .Select(categoryKey => valueByKey.GetValueOrDefault((categoryKey, seriesKey)))
                .ToList()
        }).ToList();

        var orderedCategories = orderedCategoryKeys
            .Select(key => key.Length == 0 ? "(blank)" : key)
            .ToList();

        var pointers = dto.ToleranceBands
            .Where(b => b.SourceDatasetId != 0 && b.SourceRowId != Guid.Empty && b.MinColumnId != Guid.Empty && b.MaxColumnId != Guid.Empty)
            .Select(b => (
                Key: b.Id,
                b.SourceDatasetId,
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

        return new BarChartQueryResultDto
        {
            Id = dataset.Id,
            Name = dataset.Name,
            Categories = orderedCategories,
            Series = series,
            ToleranceBands = resolvedBands
        };
    }

    /// <summary>One dataset row pivoted to the scalars a bar chart groups on: its category
    /// (blank collapsed to ""), a typed sort key for that category, its series, and its measure.</summary>
    private sealed class BarProjection
    {
        public string Category { get; set; } = "";
        public double? SortNumber { get; set; }
        public DateTime? SortDate { get; set; }
        public string Series { get; set; } = "";
        public double? Value { get; set; }
    }

    /// <summary>One aggregated bar: a category/series pair, its reduced value, and the sort key carried through.</summary>
    private sealed class BarGroup
    {
        public string Category { get; set; } = "";
        public string Series { get; set; } = "";
        public double? SortNumber { get; set; }
        public DateTime? SortDate { get; set; }
        public double? Value { get; set; }
    }
}
