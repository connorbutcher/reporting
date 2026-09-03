using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;
using Reporting.DAL.Filtering;

namespace Reporting.DAL.Widgets;

/// <summary>Read models shaped for table and chart widgets: filtered, sorted, and pre-formatted server-side.</summary>
public class WidgetQueryRepository(ReportingDbContext db, ToleranceResolver tolerance)
{
    /// <summary>
    /// Ceiling on points returned for one scatter/line query. Past this the payload and the
    /// client-side render stop being worth it; the response flags that it was capped so the
    /// widget can say so. The client thins what it draws (LTTB / large-scatter mode) on top.
    /// </summary>
    private const int MaxChartPoints = 20_000;

    /// <summary>
    /// Ceiling on rows scanned for one box-plot query. A box returns only its five-number summary,
    /// but every value must be pulled to compute the quartiles in memory, so a runaway dataset is
    /// capped here. Far past any group size where the summary would meaningfully shift.
    /// </summary>
    private const int MaxBoxPlotScanRows = 200_000;

    /// <summary>Ceiling on raw values returned per box for the jittered overlay — a shape-preserving
    /// sample, not every point, so a large group doesn't bloat the payload.</summary>
    private const int MaxBoxPointsPerGroup = 300;

    /// <summary>
    /// Narrows to rows that carry a plottable value for the axis column — a string for a text
    /// axis, a date for a date axis, a number otherwise — kept as an expression EF can translate.
    /// </summary>
    private static IQueryable<DatasetRow> RequireAxisValue(IQueryable<DatasetRow> rows, int columnId, DatasetColumnType? type) => type switch
    {
        DatasetColumnType.String => rows.Where(r => r.Cells.Any(c => c.ColumnId == columnId && c.StringValue != null)),
        DatasetColumnType.DateTime => rows.Where(r => r.Cells.Any(c => c.ColumnId == columnId && c.DateValue != null)),
        _ => rows.Where(r => r.Cells.Any(c => c.ColumnId == columnId && c.NumberValue != null))
    };

    /// <summary>
    /// The axis coordinate for a cell: the trimmed string for a text axis, epoch milliseconds for
    /// a date axis (which the client plots on an echarts time axis), else the raw number.
    /// </summary>
    private static object AxisValue(DatasetCell cell, DatasetColumnType? type) => type switch
    {
        DatasetColumnType.String => cell.StringValue!.Trim(),
        DatasetColumnType.DateTime => (cell.DateValue!.Value - DateTime.UnixEpoch).TotalMilliseconds,
        _ => cell.NumberValue!.Value
    };

    /// <summary>
    /// A page of rows shaped for a table widget: filtered and sorted server-side,
    /// with each requested column's value already formatted per its stored display
    /// configuration and classified against its tolerance band, if it has one.
    /// </summary>
    public async Task<TableQueryResultDto?> QueryForTableAsync(int id, TableQueryDto dto)
    {
        var dataset = await db.Datasets.AsNoTracking().Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        // Keyed by RefId: the client references columns by their stable RefId, and the translator
        // resolves each to the column's int id for cell comparisons.
        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);

        // Every distinct tolerance pointer among the requested columns, resolved in one batch —
        // used both to band the returned cells and to evaluate any tolerance filter operators,
        // which reuse the column's banding. Keyed by the column RefId the filter also addresses.
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

        var predicate = FilterTranslator.Build(dto.Filter, columnsByRef, bounds);

        var all = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
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

        var resultRows = rows.Select(row =>
        {
            var cells = new Dictionary<Guid, TableCellDto>();
            foreach (var setting in dto.Columns)
            {
                if (!columnsByRef.TryGetValue(setting.ColumnId, out var column)) continue;

                var cell = row.Cells.FirstOrDefault(c => c.ColumnId == column.Id);
                var display = cell is null ? null : CellFormatter.Format(cell, column.Type, column.GetConfig());

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

    /// <summary>Resolves every tolerance band's bounds in one batch, keyed by the band's client id.</summary>
    private async Task<Dictionary<string, ToleranceBounds?>> ResolveBandsAsync(IReadOnlyList<ChartToleranceBand> bands)
    {
        var pointers = bands
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
        return await tolerance.ResolveAsync(pointers);
    }

    /// <summary>Projects resolved band bounds into the client DTOs that draw the reference lines.</summary>
    private static List<ResolvedToleranceBandDto> ResolvedBands(
        IReadOnlyList<ChartToleranceBand> bands,
        IReadOnlyDictionary<string, ToleranceBounds?> bounds) =>
        bands.Select(b =>
        {
            bounds.TryGetValue(b.Id, out var bound);
            return new ResolvedToleranceBandDto
            {
                Id = b.Id,
                Axis = b.Axis,
                Min = bound?.Min,
                Max = bound?.Max,
                ConcessionLower = bound?.ConcessionLower,
                ConcessionUpper = bound?.ConcessionUpper,
                Fill = b.Fill,
                OutlinePoints = b.OutlinePoints
            };
        }).ToList();

    /// <summary>
    /// Maps each tolerance band's bounds onto the axis column it bands, for the tolerance filter
    /// operators. Only an axis carrying exactly one band is included — with several, "out of
    /// tolerance" has no single meaning, so the operator isn't offered (nor resolved) there.
    /// </summary>
    private static Dictionary<Guid, ToleranceBounds?> ToleranceByAxisColumn(
        IReadOnlyList<ChartToleranceBand> bands,
        IReadOnlyDictionary<string, ToleranceBounds?> resolved,
        Guid? xColumnId,
        Guid? yColumnId)
    {
        var map = new Dictionary<Guid, ToleranceBounds?>();
        foreach (var axisBands in bands.GroupBy(b => b.Axis))
        {
            var list = axisBands.ToList();
            if (list.Count != 1) continue;
            var column = axisBands.Key == ChartAxis.Y ? yColumnId : xColumnId;
            if (column is { } col && col != Guid.Empty) map[col] = resolved.GetValueOrDefault(list[0].Id);
        }
        return map;
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
        var dataset = await db.Datasets.AsNoTracking().Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        // Keyed by RefId (the client's reference); resolved to int ids for cell comparisons below.
        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);

        // Resolve the tolerance bands up front: their bounds draw the reference lines below, and
        // a tolerance filter operator reuses the band on the filtered column's axis.
        var bounds = await ResolveBandsAsync(dto.ToleranceBands);
        var toleranceByColumn = ToleranceByAxisColumn(dto.ToleranceBands, bounds, dto.XColumnId, dto.YColumnId);
        var predicate = FilterTranslator.Build(dto.Filter, columnsByRef, toleranceByColumn);

        var all = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var matching = predicate is null ? all : all.Where(predicate);

        // Resolve the axis columns; a missing column yields a sentinel id that matches no cell,
        // so the chart is simply empty (as before). An axis value is a string for a text column,
        // a timestamp (epoch millis) for a date column, and a number otherwise.
        var xColumn = columnsByRef.GetValueOrDefault(dto.XColumnId);
        var yColumn = columnsByRef.GetValueOrDefault(dto.YColumnId);
        var xId = xColumn?.Id ?? 0;
        var yId = yColumn?.Id ?? 0;
        var xText = xColumn?.Type == DatasetColumnType.String;

        // Points need a real value on each axis; anything missing either is dropped. Narrowed per
        // axis kind so the predicate stays EF-translatable rather than branching per row.
        var plottable = RequireAxisValue(matching, xId, xColumn?.Type);
        plottable = RequireAxisValue(plottable, yId, yColumn?.Type);

        var seriesColumn = dto.SeriesColumnId is { } seriesId ? columnsByRef.GetValueOrDefault(seriesId) : null;
        var tooltipColumns = dto.TooltipColumns
            .Select(tc => (Setting: tc, Column: columnsByRef.GetValueOrDefault(tc.ColumnId)))
            .Where(p => p.Column is not null)
            .ToList();

        // Only the cells the chart actually reads are loaded per row — the axes, the
        // series key, and any tooltip columns — via a filtered include, rather than
        // pulling every cell in the row across the wire.
        var neededIds = new HashSet<int> { xId, yId };
        if (seriesColumn is not null) neededIds.Add(seriesColumn.Id);
        foreach (var (_, column) in tooltipColumns) neededIds.Add(column!.Id);

        // Cap the rows pulled back: a runaway dataset shouldn't ship hundreds of
        // thousands of points the browser then chokes on. Count first so the client
        // can report how much was left off, then take a deterministic slice.
        var total = await plottable.CountAsync();
        var rows = await plottable
            .OrderBy(r => r.Id)
            .Take(MaxChartPoints)
            .Include(r => r.Cells.Where(c => neededIds.Contains(c.ColumnId)))
            // Read-only: these rows/cells are projected to points below and discarded, never saved.
            .AsNoTracking()
            .ToListAsync();

        var groups = new Dictionary<string, List<ChartPointDto>>();
        foreach (var row in rows)
        {
            var xCell = row.Cells.First(c => c.ColumnId == xId);
            var yCell = row.Cells.First(c => c.ColumnId == yId);
            object x = AxisValue(xCell, xColumn?.Type);
            object y = AxisValue(yCell, yColumn?.Type);

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

                var value = CellFormatter.Format(cell, column!.Type, column.GetConfig());
                if (string.IsNullOrEmpty(value)) continue;

                tooltipLines.Add($"{setting.Prefix}{value}{setting.Suffix}");
            }

            var point = new ChartPointDto { X = x, Y = y, TooltipLines = tooltipLines };
            if (groups.TryGetValue(key, out var points)) points.Add(point);
            else groups[key] = [point];
        }

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
            ToleranceBands = ResolvedBands(dto.ToleranceBands, bounds),
            TotalPoints = total,
            Truncated = total > MaxChartPoints
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
        var dataset = await db.Datasets.AsNoTracking().Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        var empty = new BarChartQueryResultDto { Id = dataset.Id, Name = dataset.Name };

        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);

        var isCount = dto.Aggregate == Aggregate.Count;

        // The measures to plot, in request order — several become several series per category,
        // grouped or stacked. The deprecated single ValueColumnId folds in when the list is empty.
        var valueColumnIds = dto.ValueColumnIds.Count > 0
            ? dto.ValueColumnIds
            : (dto.ValueColumnId is { } single ? new List<Guid> { single } : new List<Guid>());

        // Bands sit on the value (Y) axis; a tolerance filter reuses the band on that axis to
        // narrow rows by the measure column before they're aggregated into bars. With several
        // measures the first stands in — a per-measure tolerance filter isn't expressible here.
        var bounds = await ResolveBandsAsync(dto.ToleranceBands);
        var toleranceByColumn = ToleranceByAxisColumn(
            dto.ToleranceBands, bounds, dto.CategoryColumnId, valueColumnIds.FirstOrDefault());
        var predicate = FilterTranslator.Build(dto.Filter, columnsByRef, toleranceByColumn);

        var all = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var matching = predicate is null ? all : all.Where(predicate);

        // A missing category (nothing bound yet) yields an empty chart, the same graceful
        // no-op scatter/line give when their axes aren't set.
        var categoryColumn = columnsByRef.GetValueOrDefault(dto.CategoryColumnId);
        if (categoryColumn is null) return empty;
        var categoryId = categoryColumn.Id;

        // Count needs no measure — it reduces to one implicit series (null column). Every other
        // aggregate reduces each bound value column into its own series; unknown ids drop out.
        var measures = isCount
            ? new List<DatasetColumn?> { null }
            : valueColumnIds
                .Select(vid => columnsByRef.GetValueOrDefault(vid))
                .Where(c => c is not null)
                .ToList();
        if (measures.Count == 0) return empty;

        // A sentinel id matches no cell, so with no series column every row falls into one
        // group whose key is "" — the single unlabelled series the client expects.
        var seriesColumn = dto.SeriesColumnId is { } sId ? columnsByRef.GetValueOrDefault(sId) : null;
        var seriesId = seriesColumn?.Id ?? 0;

        // Reduce one measure into its (category, series) groups — a single SQL GROUP BY, run
        // once per bound value column. Count ignores the measure and counts rows.
        async Task<List<BarGroup>> AggregateMeasureAsync(int valueId)
        {
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

            return await query.ToListAsync();
        }

        // Aggregate every measure, keeping each measure's groups tagged with the column they came from.
        var perMeasure = new List<(DatasetColumn? Column, List<BarGroup> Groups)>();
        foreach (var measure in measures)
        {
            perMeasure.Add((measure, await AggregateMeasureAsync(measure?.Id ?? 0)));
        }
        var allGroups = perMeasure.SelectMany(m => m.Groups).ToList();

        // Order categories once across every measure: numerically/chronologically for numeric and
        // date columns (blanks, whose sort key is null, sink to the end), alphabetically otherwise.
        var numeric = categoryColumn.Type is DatasetColumnType.Int or DatasetColumnType.Double;
        var date = categoryColumn.Type is DatasetColumnType.DateTime;
        var byCategory = allGroups
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

        // With no series column every group's key is "" — one series carrying the empty label
        // the client reads as "no series". Otherwise a blank key shows as "(blank)".
        string SeriesLabel(string key) => seriesColumn is null ? "" : (key.Length == 0 ? "(blank)" : key);

        // One series per (measure × split key), measure-major so a measure's split series sit together.
        var series = perMeasure.SelectMany(m =>
        {
            var valueByKey = m.Groups.ToDictionary(g => (g.Category, g.Series), g => g.Value);
            var seriesKeys = m.Groups
                .Select(g => g.Series)
                .Distinct()
                .OrderBy(s => s, StringComparer.OrdinalIgnoreCase)
                .ToList();
            return seriesKeys.Select(seriesKey => new BarSeriesDto
            {
                Label = SeriesLabel(seriesKey),
                ValueColumnId = m.Column?.RefId,
                ValueColumnLabel = m.Column?.Name ?? "",
                Values = orderedCategoryKeys
                    .Select(categoryKey => valueByKey.GetValueOrDefault((categoryKey, seriesKey)))
                    .ToList()
            });
        }).ToList();

        var orderedCategories = orderedCategoryKeys
            .Select(key => key.Length == 0 ? "(blank)" : key)
            .ToList();

        return new BarChartQueryResultDto
        {
            Id = dataset.Id,
            Name = dataset.Name,
            Categories = orderedCategories,
            Series = series,
            ToleranceBands = ResolvedBands(dto.ToleranceBands, bounds)
        };
    }

    /// <summary>
    /// Rows shaped for a box-and-whisker chart: filtered, then grouped by the category
    /// column and each group's values in the measure column reduced to a five-number
    /// summary (min, Q1, median, Q3, max). Unlike bar's single SQL GROUP BY this needs
    /// every value to compute quartiles, so the lightweight (category, series, value)
    /// scalars are pulled back and summarised in memory. A series column, if set, splits
    /// each category into a box per series. Whiskers reach the actual extremes, or 1.5×IQR
    /// past the quartiles with the remainder returned as outlier points.
    /// </summary>
    public async Task<BoxPlotQueryResultDto?> QueryForBoxPlotAsync(int id, BoxPlotQueryDto dto)
    {
        var dataset = await db.Datasets.AsNoTracking().Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        var empty = new BoxPlotQueryResultDto { Id = dataset.Id, Name = dataset.Name };

        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);

        // Bands sit on the value axis; a tolerance filter reuses the band on that axis to narrow
        // rows by the measure column before they're summarised into boxes.
        var bounds = await ResolveBandsAsync(dto.ToleranceBands);
        var toleranceByColumn = ToleranceByAxisColumn(dto.ToleranceBands, bounds, dto.CategoryColumnId, dto.ValueColumnId);
        var predicate = FilterTranslator.Build(dto.Filter, columnsByRef, toleranceByColumn);

        var all = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var matching = predicate is null ? all : all.Where(predicate);

        // A missing category or measure (nothing bound yet) yields an empty chart, the same
        // graceful no-op the other chart kinds give when their axes aren't set.
        var categoryColumn = columnsByRef.GetValueOrDefault(dto.CategoryColumnId);
        if (categoryColumn is null) return empty;
        var categoryId = categoryColumn.Id;

        var valueColumn = columnsByRef.GetValueOrDefault(dto.ValueColumnId);
        if (valueColumn is null) return empty;
        var valueId = valueColumn.Id;

        // A sentinel id matches no cell, so with no series column every row falls into one
        // group whose key is "" — the single unlabelled series the client expects.
        var seriesColumn = dto.SeriesColumnId is { } sId ? columnsByRef.GetValueOrDefault(sId) : null;
        var seriesId = seriesColumn?.Id ?? 0;

        // Only rows carrying a numeric measure can feed a box; a category with none simply
        // doesn't appear, matching bar's non-count behaviour.
        var rowsQuery = matching.Where(r => r.Cells.Any(c => c.ColumnId == valueId && c.NumberValue != null));

        // One scalar row per dataset row — its category, a typed sort key, its series, and its
        // measure — pivoted out of the cell table. Capped so a runaway dataset can't be pulled
        // wholesale into memory; the summary of a very large group is unaffected in practice.
        // Pull only the cells each box needs — the category cell (its three typed forms fetched
        // together in one subquery, not three), the series key, and the measure — then pivot in
        // memory. A read-only projection to scalars, so none of it is change-tracked. The value is
        // never null here: rowsQuery already required a numeric measure on every row.
        var scanned = await rowsQuery
            .OrderBy(r => r.Id)
            .Take(MaxBoxPlotScanRows)
            .Select(r => new
            {
                Category = r.Cells
                    .Where(c => c.ColumnId == categoryId)
                    .Select(c => new { c.StringValue, c.NumberValue, c.DateValue })
                    .FirstOrDefault(),
                Series = r.Cells.Where(c => c.ColumnId == seriesId).Select(c => c.StringValue).FirstOrDefault(),
                Value = r.Cells.Where(c => c.ColumnId == valueId).Select(c => c.NumberValue).FirstOrDefault()
            })
            .ToListAsync();

        var projected = scanned
            .Select(r => new BoxProjection
            {
                Category = r.Category?.StringValue ?? "",
                SortNumber = r.Category?.NumberValue,
                SortDate = r.Category?.DateValue,
                Series = (r.Series ?? "").Trim(),
                Value = r.Value ?? 0d
            })
            .ToList();

        // Values grouped by (category, series) to summarise one box at a time, and pooled per
        // category (across series) so a median/spread sort has a single figure to rank each on.
        var valuesByKey = projected
            .GroupBy(p => (p.Category, p.Series))
            .ToDictionary(g => g.Key, g => g.Select(x => x.Value).ToList());
        // Only a median/spread sort needs the values pooled across series, so skip that second
        // grouping (and its copy of every value) in the common category-order case.
        var pooledByCategory = dto.Sort == BoxSort.Category
            ? new Dictionary<string, List<double>>()
            : projected.GroupBy(p => p.Category).ToDictionary(g => g.Key, g => g.Select(x => x.Value).ToList());

        // The category column's own order first: numerically/chronologically for numeric and date
        // columns (blanks, whose sort key is null, sink to the end), alphabetically otherwise.
        var numeric = categoryColumn.Type is DatasetColumnType.Int or DatasetColumnType.Double;
        var date = categoryColumn.Type is DatasetColumnType.DateTime;
        var baseOrder = (numeric || date)
            ? projected
                .GroupBy(p => p.Category)
                .Select(g => new
                {
                    Category = g.Key,
                    Sort = numeric ? g.Min(x => x.SortNumber)
                        : date ? g.Min(x => x.SortDate)?.Ticks
                        : (double?)null
                })
                .OrderBy(c => c.Sort ?? double.MaxValue)
                .Select(c => c.Category)
                .ToList()
            : projected.Select(p => p.Category).Distinct().OrderBy(k => k, StringComparer.OrdinalIgnoreCase).ToList();

        // A median/spread sort re-ranks from that base order (kept as the stable tiebreak).
        var orderedCategoryKeys = SortCategories(baseOrder, pooledByCategory, dto.Sort);
        var categoryIndex = orderedCategoryKeys
            .Select((key, i) => (key, i))
            .ToDictionary(x => x.key, x => x.i);

        var orderedSeriesKeys = projected
            .Select(p => p.Series)
            .Distinct()
            .OrderBy(s => s, StringComparer.OrdinalIgnoreCase)
            .ToList();

        string SeriesLabel(string key) => seriesColumn is null ? "" : (key.Length == 0 ? "(blank)" : key);

        var series = orderedSeriesKeys.Select(seriesKey =>
        {
            var boxes = new List<BoxDto?>(orderedCategoryKeys.Count);
            var outliers = new List<BoxOutlierDto>();
            foreach (var categoryKey in orderedCategoryKeys)
            {
                if (!valuesByKey.TryGetValue((categoryKey, seriesKey), out var values) || values.Count == 0)
                {
                    boxes.Add(null);
                    continue;
                }
                var (box, groupOutliers) = Summarise(values, dto.Whisker, dto.WhiskerFactor, dto.IncludePoints);
                boxes.Add(box);
                foreach (var value in groupOutliers)
                    outliers.Add(new BoxOutlierDto { CategoryIndex = categoryIndex[categoryKey], Value = value });
            }
            return new BoxPlotSeriesDto { Label = SeriesLabel(seriesKey), Boxes = boxes, Outliers = outliers };
        }).ToList();

        var orderedCategories = orderedCategoryKeys
            .Select(key => key.Length == 0 ? "(blank)" : key)
            .ToList();

        return new BoxPlotQueryResultDto
        {
            Id = dataset.Id,
            Name = dataset.Name,
            Categories = orderedCategories,
            Series = series,
            ToleranceBands = ResolvedBands(dto.ToleranceBands, bounds)
        };
    }

    /// <summary>
    /// Reduces one group's values to a box summary: the quartiles, the mean and (sample) standard
    /// deviation, and the whiskers. The whiskers reach the actual extremes (MinMax), the furthest
    /// values within <paramref name="factor"/>×IQR of the quartiles (Tukey), or within
    /// <paramref name="factor"/>×σ of the mean (StdDev); in the latter two, anything beyond the
    /// fence is returned as an outlier. Quartiles use linear interpolation between closest ranks
    /// (the type-7 / Excel PERCENTILE.INC method). When <paramref name="includePoints"/> is set the
    /// box also carries a capped, even sample of its raw values for the jittered overlay.
    /// </summary>
    private static (BoxDto Box, List<double> Outliers) Summarise(
        List<double> values, BoxWhisker whisker, double factor, bool includePoints)
    {
        values.Sort();
        var q1 = Quantile(values, 0.25);
        var median = Quantile(values, 0.5);
        var q3 = Quantile(values, 0.75);
        var mean = values.Average();
        var stdDev = StdDev(values, mean);

        double low, high;
        var outliers = new List<double>();
        if (whisker == BoxWhisker.MinMax)
        {
            low = values[0];
            high = values[^1];
        }
        else
        {
            // Tukey fences off the quartiles; StdDev fences off the mean. A non-positive factor
            // would collapse the fences onto the centre, so it's floored at zero.
            var k = Math.Max(0, factor);
            double lowerFence, upperFence;
            if (whisker == BoxWhisker.StdDev)
            {
                lowerFence = mean - k * stdDev;
                upperFence = mean + k * stdDev;
            }
            else
            {
                var iqr = q3 - q1;
                lowerFence = q1 - k * iqr;
                upperFence = q3 + k * iqr;
            }
            // Whiskers stop at the most extreme values still inside the fences.
            low = values.First(v => v >= lowerFence);
            high = values.Last(v => v <= upperFence);
            foreach (var v in values)
                if (v < lowerFence || v > upperFence) outliers.Add(v);
        }

        var box = new BoxDto
        {
            Min = low, Q1 = q1, Median = median, Q3 = q3, Max = high,
            Mean = mean, StdDev = stdDev, Count = values.Count,
            Points = includePoints ? SamplePoints(values) : new List<double>()
        };
        return (box, outliers);
    }

    /// <summary>The sample standard deviation (n−1 divisor); 0 for fewer than two values.</summary>
    private static double StdDev(IReadOnlyList<double> values, double mean)
    {
        if (values.Count < 2) return 0;
        var sum = 0.0;
        foreach (var v in values)
        {
            var d = v - mean;
            sum += d * d;
        }
        return Math.Sqrt(sum / (values.Count - 1));
    }

    /// <summary>A capped, evenly-spaced sample of an already-sorted list — enough to show the
    /// distribution's shape in a jittered overlay without shipping every underlying value.</summary>
    private static List<double> SamplePoints(List<double> sorted)
    {
        if (sorted.Count <= MaxBoxPointsPerGroup) return new List<double>(sorted);
        var step = (double)sorted.Count / MaxBoxPointsPerGroup;
        var sample = new List<double>(MaxBoxPointsPerGroup);
        for (var i = 0; i < MaxBoxPointsPerGroup; i++) sample.Add(sorted[(int)(i * step)]);
        return sample;
    }

    /// <summary>
    /// Re-orders the categories by a computed statistic when asked, keeping <paramref name="baseOrder"/>
    /// (the category column's own order) as the stable tiebreak. The statistic is pooled across every
    /// series in a category: its median, or its spread (IQR) for the spread sort.
    /// </summary>
    private static List<string> SortCategories(
        List<string> baseOrder, IReadOnlyDictionary<string, List<double>> pooled, BoxSort sort)
    {
        if (sort == BoxSort.Category) return baseOrder;

        double Metric(string category)
        {
            var values = pooled[category];
            values.Sort();
            return sort == BoxSort.SpreadDesc
                ? Quantile(values, 0.75) - Quantile(values, 0.25)
                : Quantile(values, 0.5);
        }

        var indexed = baseOrder.Select((category, i) => (category, i)).ToList();
        var ranked = sort == BoxSort.MedianAsc
            ? indexed.OrderBy(x => Metric(x.category)).ThenBy(x => x.i)
            : indexed.OrderByDescending(x => Metric(x.category)).ThenBy(x => x.i);
        return ranked.Select(x => x.category).ToList();
    }

    /// <summary>The p-quantile (0..1) of an already-sorted list, linearly interpolated between ranks.</summary>
    private static double Quantile(IReadOnlyList<double> sorted, double p)
    {
        if (sorted.Count == 1) return sorted[0];
        var h = (sorted.Count - 1) * p;
        var lo = (int)Math.Floor(h);
        if (lo >= sorted.Count - 1) return sorted[^1];
        return sorted[lo] + (h - lo) * (sorted[lo + 1] - sorted[lo]);
    }

    /// <summary>One dataset row pivoted to the scalars a box plot groups on: its category
    /// (blank collapsed to ""), a typed sort key for that category, its series, and its measure.</summary>
    private sealed class BoxProjection
    {
        public string Category { get; set; } = "";
        public double? SortNumber { get; set; }
        public DateTime? SortDate { get; set; }
        public string Series { get; set; } = "";
        public double Value { get; set; }
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
