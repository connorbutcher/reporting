using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;
using Reporting.DAL.Filtering;
using Reporting.DAL.Widgets;

namespace Reporting.DAL.Repositories;

/// <summary>All querying and persistence for datasets, their columns, rows and cells.</summary>
public class DatasetRepository(ReportingDbContext db, ToleranceResolver tolerance)
{
    public async Task<List<DatasetSummaryDto>> GetAllAsync()
    {
        var datasets = await db.Datasets.ToListAsync();
        return datasets.Select(d => d.ToSummaryDto()).ToList();
    }

    public async Task<DatasetSchemaDto?> GetSchemaAsync(Guid id)
    {
        var dataset = await db.Datasets
            .Include(d => d.Columns)
            .FirstOrDefaultAsync(d => d.Id == id);
        return dataset?.ToSchemaDto();
    }

    public async Task<DatasetDataDto?> GetDataAsync(Guid id)
    {
        var dataset = await db.Datasets
            .Include(d => d.Rows).ThenInclude(r => r.Cells)
            .FirstOrDefaultAsync(d => d.Id == id);
        return dataset?.ToDataDto();
    }

    /// <summary>
    /// The rows matching a filter. Filtering runs in SQL so a widget never pulls
    /// rows it won't show. Throws <see cref="FilterException"/> for a filter that
    /// doesn't match the dataset's schema; null means the dataset itself wasn't found.
    /// </summary>
    public async Task<DatasetQueryResultDto?> QueryAsync(Guid id, FilterGroupDto? filter)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        var predicate = FilterTranslator.Build(filter, dataset.Columns.ToDictionary(c => c.Id));

        var all = db.DatasetRows.Where(r => r.DatasetId == id);
        var matching = predicate is null ? all : all.Where(predicate);

        var rows = await matching.Include(r => r.Cells).ToListAsync();

        return new DatasetQueryResultDto
        {
            Id = dataset.Id,
            Name = dataset.Name,
            Rows = rows.Select(r => r.ToDto()).ToList(),
            TotalRowCount = await all.CountAsync(),
            MatchedRowCount = rows.Count
        };
    }

    /// <summary>
    /// A page of rows shaped for a table widget: filtered and sorted server-side,
    /// with each requested column's value already formatted per its stored display
    /// configuration and classified against its tolerance band, if it has one.
    /// </summary>
    public async Task<TableQueryResultDto?> QueryForTableAsync(Guid id, TableQueryDto dto)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        var columnsById = dataset.Columns.ToDictionary(c => c.Id);
        var predicate = FilterTranslator.Build(dto.Filter, columnsById);

        var all = db.DatasetRows.Where(r => r.DatasetId == id);
        var matching = predicate is null ? all : all.Where(predicate);

        var totalRowCount = await all.CountAsync();
        var matchedRowCount = await matching.CountAsync();

        var sortColumn = dto.SortColumnId is { } sortId ? columnsById.GetValueOrDefault(sortId) : null;
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
                if (!columnsById.TryGetValue(setting.ColumnId, out var column)) continue;

                var cell = row.Cells.FirstOrDefault(c => c.ColumnId == setting.ColumnId);
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
            return new TableRowResultDto { Id = row.Id, Cells = cells };
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
    public async Task<ChartQueryResultDto?> QueryForChartAsync(Guid id, ChartQueryDto dto)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        var columnsById = dataset.Columns.ToDictionary(c => c.Id);
        var predicate = FilterTranslator.Build(dto.Filter, columnsById);

        var all = db.DatasetRows.Where(r => r.DatasetId == id);
        var matching = predicate is null ? all : all.Where(predicate);

        var xId = dto.XColumnId;
        var yId = dto.YColumnId;

        // Points need a real x and y; anything missing either is dropped, same
        // as the client's old Number.isFinite check.
        var plottable = matching.Where(r =>
            r.Cells.Any(c => c.ColumnId == xId && c.NumberValue != null) &&
            r.Cells.Any(c => c.ColumnId == yId && c.NumberValue != null));

        var rows = await plottable.Include(r => r.Cells).ToListAsync();

        var seriesColumn = dto.SeriesColumnId is { } seriesId ? columnsById.GetValueOrDefault(seriesId) : null;
        var tooltipColumns = dto.TooltipColumns
            .Select(tc => (Setting: tc, Column: columnsById.GetValueOrDefault(tc.ColumnId)))
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
            Id = dataset.Id,
            Name = dataset.Name,
            Series = groups.Select(g => new ChartSeriesDto { Label = g.Key, Points = g.Value }).ToList(),
            ToleranceBands = resolvedBands
        };
    }

    /// <summary>Replaces a column's free-form display configuration blob.</summary>
    public async Task<DatasetColumnDto?> UpdateColumnConfigurationAsync(Guid id, Guid columnId, string configurationJson)
    {
        var column = await db.DatasetColumns.FirstOrDefaultAsync(c => c.Id == columnId && c.DatasetId == id);
        if (column is null) return null;

        column.ConfigurationJson = configurationJson;
        await db.SaveChangesAsync();
        return column.ToDto();
    }

    // --- dataset management ---------------------------------------------------

    public async Task<DatasetSummaryDto> CreateAsync(string name)
    {
        var dataset = new Dataset { Id = Guid.NewGuid(), Name = name };
        db.Datasets.Add(dataset);
        await db.SaveChangesAsync();
        return dataset.ToSummaryDto();
    }

    public async Task<DatasetSummaryDto?> RenameAsync(Guid id, string name)
    {
        var dataset = await db.Datasets.FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        dataset.Name = name;
        await db.SaveChangesAsync();
        return dataset.ToSummaryDto();
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var dataset = await db.Datasets.FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return false;

        // Columns and rows cascade; widgets pointing here are reported as an
        // issue in the builder rather than blocking the delete.
        db.Datasets.Remove(dataset);
        await db.SaveChangesAsync();
        return true;
    }

    // --- columns --------------------------------------------------------------

    public async Task<DatasetColumnDto?> AddColumnAsync(Guid id, string name, DatasetColumnType type)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        var column = new DatasetColumn
        {
            Id = Guid.NewGuid(),
            DatasetId = id,
            Name = name,
            Type = type,
            Order = dataset.Columns.Count == 0 ? 0 : dataset.Columns.Max(c => c.Order) + 1,
        };

        dataset.Columns.Add(column);
        // The id is generated here, so change detection would otherwise read
        // this as an existing row and emit an UPDATE that matches nothing.
        db.Entry(column).State = EntityState.Added;

        await db.SaveChangesAsync();
        return column.ToDto();
    }

    public async Task<DatasetColumnDto?> UpdateColumnAsync(Guid id, Guid columnId, string name, DatasetColumnType type)
    {
        var column = await db.DatasetColumns.FirstOrDefaultAsync(c => c.Id == columnId && c.DatasetId == id);
        if (column is null) return null;

        var typeChanged = column.Type != type;
        column.Name = name;
        column.Type = type;

        if (typeChanged)
        {
            // The typed fields were parsed under the old type, so they're now wrong;
            // re-derive them from the text each cell still carries.
            var cells = await db.DatasetCells.Where(c => c.ColumnId == columnId).ToListAsync();
            foreach (var cell in cells) CellValues.Apply(cell, cell.StringValue, type);
        }

        await db.SaveChangesAsync();
        return column.ToDto();
    }

    public async Task<bool> DeleteColumnAsync(Guid id, Guid columnId)
    {
        var column = await db.DatasetColumns.FirstOrDefaultAsync(c => c.Id == columnId && c.DatasetId == id);
        if (column is null) return false;

        db.DatasetColumns.Remove(column);

        // Cells reference the column by id without a FK, so clear them explicitly
        // rather than leaving rows carrying values for a column that's gone.
        var cells = await db.DatasetCells.Where(c => c.ColumnId == columnId).ToListAsync();
        db.DatasetCells.RemoveRange(cells);

        await db.SaveChangesAsync();
        return true;
    }

    public async Task<DatasetSchemaDto?> ReorderColumnsAsync(Guid id, List<Guid> columnIds)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        for (var i = 0; i < columnIds.Count; i++)
        {
            var column = dataset.Columns.FirstOrDefault(c => c.Id == columnIds[i]);
            if (column is not null) column.Order = i;
        }

        await db.SaveChangesAsync();
        return dataset.ToSchemaDto();
    }

    // --- rows -----------------------------------------------------------------

    public async Task<DatasetRowDto?> AddRowAsync(Guid id, Dictionary<Guid, string> values)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        var row = new DatasetRow { Id = Guid.NewGuid(), DatasetId = id };
        ApplyValues(dataset, row, values);

        db.DatasetRows.Add(row);
        await db.SaveChangesAsync();
        return row.ToDto();
    }

    public async Task<DatasetRowDto?> UpdateRowAsync(Guid id, Guid rowId, Dictionary<Guid, string> values)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        var row = await db.DatasetRows
            .Include(r => r.Cells)
            .FirstOrDefaultAsync(r => r.Id == rowId && r.DatasetId == id);
        if (row is null) return null;

        ApplyValues(dataset, row, values);
        await db.SaveChangesAsync();
        return row.ToDto();
    }

    public async Task<bool> DeleteRowAsync(Guid id, Guid rowId)
    {
        var row = await db.DatasetRows.FirstOrDefaultAsync(r => r.Id == rowId && r.DatasetId == id);
        if (row is null) return false;

        db.DatasetRows.Remove(row);
        await db.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Rewrites a row's cells from the submitted values, parsing each against its
    /// column's type. Values for columns the dataset doesn't have are ignored, so
    /// stale keys never accumulate.
    /// </summary>
    private void ApplyValues(Dataset dataset, DatasetRow row, Dictionary<Guid, string> values)
    {
        var columnsById = dataset.Columns.ToDictionary(c => c.Id);

        foreach (var (columnId, raw) in values)
        {
            if (!columnsById.TryGetValue(columnId, out var column)) continue;

            var cell = row.Cells.FirstOrDefault(c => c.ColumnId == columnId);
            if (cell is null)
            {
                cell = CellValues.Create(row.Id, columnId, raw, column.Type);
                row.Cells.Add(cell);

                // Cell ids are generated here, so change detection would otherwise read
                // this as an existing row and emit an UPDATE that matches nothing.
                db.Entry(cell).State = EntityState.Added;
            }
            else
            {
                CellValues.Apply(cell, raw, column.Type);
            }
        }

        // A value the client omitted means the cell was cleared.
        var submitted = values.Keys.ToHashSet();
        var dropped = row.Cells.Where(c => !submitted.Contains(c.ColumnId)).ToList();
        foreach (var cell in dropped)
        {
            row.Cells.Remove(cell);
            db.DatasetCells.Remove(cell);
        }
    }
}
