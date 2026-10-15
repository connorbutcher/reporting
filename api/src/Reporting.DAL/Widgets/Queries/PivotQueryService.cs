using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Rows shaped for a pivot / aggregation table: filtered, then grouped by the row-dimension
/// columns and each group reduced to one value per measure by that measure's aggregate. Because
/// the cells are an EAV table, the needed cells are pulled back (capped) and grouped in memory —
/// the tabular counterpart of the bar chart's aggregate. An optional grand-total row reduces
/// every matched row. Dimension and measure values come back already formatted for display.
/// </summary>
public class PivotQueryService(ReportingDbContext db, DatasetResolver resolver)
{
    /// <summary>
    /// Ceiling on rows scanned for one pivot query. Every row must be pulled to be grouped and
    /// reduced in memory, so a runaway dataset is capped here; the response flags that it happened.
    /// </summary>
    private const int MaxPivotScanRows = 200_000;

    /// <summary>Ceiling on the number of grouped rows a pivot returns, so a high-cardinality dimension
    /// can't fan out into an unbounded table. The grand total still reduces every scanned row.</summary>
    private const int MaxPivotRows = 2_000;

    public async Task<PivotQueryResultDto?> QueryForPivotAsync(int id, PivotQueryDto dto)
    {
        var resolved = await resolver.ResolveAsync(id);
        if (resolved is null)
        {
            return null;
        }
        var dataset = resolved.Physical;

        var result = new PivotQueryResultDto { Id = resolved.Id, Name = resolved.Name };
        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);

        var operatorCatalogue = await FilterOperators.LoadCatalogueAsync(db);
        var baseRows = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var all = FilterTranslator.Apply(baseRows, resolved.MandatoryFilter, columnsByRef, operatorCatalogue: operatorCatalogue);
        var predicate = FilterTranslator.Build(dto.Filter, columnsByRef, operatorCatalogue: operatorCatalogue);
        var matching = predicate is null ? all : all.Where(predicate);

        result.TotalRowCount = await all.CountAsync();
        result.MatchedRowCount = predicate is null ? result.TotalRowCount : await matching.CountAsync();

        // Dimensions in request order; an unknown column id simply drops out.
        var rowFields = dto.RowFields
            .Select(columnRef => columnsByRef.GetValueOrDefault(columnRef))
            .Where(c => c is not null)
            .Select(c => c!)
            .ToList();

        // Measures in request order — Count needs no column; every other aggregate needs a resolvable one.
        var measures = dto.Measures
            .Select((m, i) => new PivotMeasurePlan(
                i, m.Aggregate, m.Label,
                m.Aggregate == Aggregate.Count ? null : columnsByRef.GetValueOrDefault(m.ColumnId ?? Guid.Empty)))
            .Where(m => m.Aggregate == Aggregate.Count || m.Column is not null)
            .ToList();

        // Nothing to reduce yet (no valid measure): a graceful empty result, like the charts give.
        if (measures.Count == 0)
        {
            return result;
        }

        result.RowFields = rowFields.Select(c => new PivotFieldDto { ColumnId = c.RefId, Label = c.Name }).ToList();
        result.Measures = measures.Select(MeasureColumn).ToList();

        // Pull only the cells the pivot reads — the dimensions and the measure columns — capped so a
        // runaway dataset can't be dragged into memory wholesale.
        var neededIds = new HashSet<int>(rowFields.Select(c => c.Id));
        foreach (var measure in measures)
        {
            if (measure.Column is not null)
            {
                neededIds.Add(measure.Column.Id);
            }
        }

        var rows = await matching
            .OrderBy(r => r.Id)
            .Take(MaxPivotScanRows)
            .Include(r => r.Cells.Where(c => neededIds.Contains(c.ColumnId)))
            .AsNoTracking()
            .ToListAsync();
        var scanTruncated = result.MatchedRowCount > MaxPivotScanRows;

        // Group the scanned rows by their dimension key, accumulating each measure as we go. The key
        // is the tuple of formatted dimension values; a parallel tuple of typed sort keys orders them.
        var groups = new Dictionary<string, PivotGroup>();
        var grand = new PivotGroup(Array.Empty<string>(), Array.Empty<object?>(), measures.Count);

        foreach (var row in rows)
        {
            var displays = new string[rowFields.Count];
            var sortKeys = new object?[rowFields.Count];
            for (var dimensionIndex = 0; dimensionIndex < rowFields.Count; dimensionIndex++)
            {
                var field = rowFields[dimensionIndex];
                var cell = row.Cells.FirstOrDefault(c => c.ColumnId == field.Id);
                displays[dimensionIndex] = DimensionDisplay(cell, field);
                sortKeys[dimensionIndex] = DimensionSortKey(cell, field.Type);
            }

            // A control character (never found in real cell text) separates the dimensions so two
            // categories can't collide by having their values run together differently.
            var key = string.Join('\u0001', displays);
            if (!groups.TryGetValue(key, out var group))
            {
                group = new PivotGroup(displays, sortKeys, measures.Count);
                groups[key] = group;
            }

            Accumulate(group, measures, row);
            Accumulate(grand, measures, row);
        }

        // Order the groups: by a chosen measure's value when asked (a genuine top-N, since it's
        // applied before the row cap), otherwise by the dimension keys. The client's sort index is a
        // request position, so it's mapped to this (filtered) list's position — which is how the
        // accumulators are keyed. A measure sort keeps the dimension order as the stable tiebreak;
        // groups with no value for the measure sink last.
        var dimensionOrder = new PivotGroupComparer(rowFields.Select(c => c.Type).ToList());
        var sortMeasureIndex = dto.SortMeasureIndex is { } requestedIndex
            ? measures.FindIndex(m => m.Index == requestedIndex)
            : -1;
        IEnumerable<PivotGroup> orderedGroups;
        if (sortMeasureIndex >= 0)
        {
            var sortMeasure = measures[sortMeasureIndex];
            orderedGroups = dto.SortDescending
                ? groups.Values.OrderByDescending(group => MeasureSortKey(group, sortMeasure, sortMeasureIndex, dto.SortDescending)).ThenBy(group => group, dimensionOrder)
                : groups.Values.OrderBy(group => MeasureSortKey(group, sortMeasure, sortMeasureIndex, dto.SortDescending)).ThenBy(group => group, dimensionOrder);
        }
        else
        {
            orderedGroups = groups.Values.OrderBy(group => group, dimensionOrder);
        }
        var ordered = orderedGroups.Take(MaxPivotRows).ToList();

        result.Rows = ordered.Select(group => PivotRow(group, measures)).ToList();

        if (dto.ShowGrandTotal && rowFields.Count > 0)
        {
            result.GrandTotal = GrandTotalRow(grand, measures, rowFields.Count);
        }

        result.Truncated = scanTruncated || groups.Count > MaxPivotRows;
        return result;
    }

    /// <summary>The client-facing column header for one measure: its key, label, source column, and aggregate.</summary>
    private static PivotMeasureColumnDto MeasureColumn(PivotMeasurePlan measure) => new()
    {
        Key = $"m{measure.Index}",
        Label = string.IsNullOrWhiteSpace(measure.Label) ? MeasureLabel(measure.Aggregate, measure.Column) : measure.Label,
        ColumnId = measure.Column?.RefId,
        Aggregate = measure.Aggregate,
    };

    /// <summary>One grouped row: its dimension display values and one formatted cell per measure.</summary>
    private static PivotRowDto PivotRow(PivotGroup group, List<PivotMeasurePlan> measures) => new()
    {
        Dimensions = group.Displays.ToList(),
        Values = measures.Select((measure, index) => MeasureCell(group, measure, index)).ToList(),
    };

    /// <summary>The grand-total row: "Total" under the first dimension, the rest blank, with every measure reduced across all matched rows.</summary>
    private static PivotRowDto GrandTotalRow(PivotGroup grand, List<PivotMeasurePlan> measures, int dimensionCount)
    {
        var totalDims = new List<string>(dimensionCount) { "Total" };
        for (var dimensionIndex = 1; dimensionIndex < dimensionCount; dimensionIndex++)
        {
            totalDims.Add(string.Empty);
        }

        return new PivotRowDto
        {
            Dimensions = totalDims,
            Values = measures.Select((measure, index) => MeasureCell(grand, measure, index)).ToList(),
            IsGrandTotal = true,
        };
    }

    /// <summary>Adds one row's contribution to a group: each measure's running sum/count/min/max, and the row tally.</summary>
    private static void Accumulate(PivotGroup group, List<PivotMeasurePlan> measures, DatasetRow row)
    {
        group.RowCount++;
        for (var i = 0; i < measures.Count; i++)
        {
            var column = measures[i].Column;
            if (column is null)
            {
                continue; // Count reads only the row tally.
            }

            var value = row.Cells.FirstOrDefault(c => c.ColumnId == column.Id)?.NumberValue;
            if (value is { } v)
            {
                group.Measures[i].Add(v);
            }
        }
    }

    /// <summary>One measure's reduced value for a group — the figure both the cell and a measure sort read.</summary>
    private static double? MeasureValue(PivotGroup group, PivotMeasurePlan measure, int index)
    {
        var acc = group.Measures[index];
        return measure.Aggregate switch
        {
            Aggregate.Count => group.RowCount,
            Aggregate.Sum => acc.Count > 0 ? acc.Sum : null,
            Aggregate.Average => acc.Count > 0 ? acc.Sum / acc.Count : null,
            Aggregate.Min => acc.Count > 0 ? acc.Min : null,
            Aggregate.Max => acc.Count > 0 ? acc.Max : null,
            _ => null,
        };
    }

    /// <summary>A measure's sort key for ordering groups — its reduced value, with a group that has
    /// none sunk to the end regardless of sort direction.</summary>
    private static double MeasureSortKey(PivotGroup group, PivotMeasurePlan measure, int index, bool descending) =>
        MeasureValue(group, measure, index) ?? (descending ? double.NegativeInfinity : double.PositiveInfinity);

    /// <summary>One measure's value for a group, reduced from its accumulator and formatted for display.</summary>
    private static PivotCellDto MeasureCell(PivotGroup group, PivotMeasurePlan measure, int index)
    {
        if (MeasureValue(group, measure, index) is not { } v)
        {
            return new PivotCellDto { Value = null, DisplayValue = null };
        }

        // Count is a plain tally (no column formatting); every other aggregate carries the measure
        // column's own numeric formatting, so £/mm suffixes and decimals come through.
        var config = measure.Aggregate == Aggregate.Count ? null : measure.Column?.GetConfig() as NumericColumnConfig;
        return new PivotCellDto { Value = v, DisplayValue = CellFormatter.Number(v, config) };
    }

    /// <summary>A dimension cell's display string — its formatted value, blank collapsed to "(blank)".</summary>
    private static string DimensionDisplay(DatasetCell? cell, DatasetColumn column)
    {
        var display = cell is null ? null : CellFormatter.Format(cell, column.Type, column.GetConfig());
        return string.IsNullOrEmpty(display) ? "(blank)" : display;
    }

    /// <summary>A dimension cell's typed ordering key: a number (date as ticks) for numeric/date columns, else the string.</summary>
    private static object? DimensionSortKey(DatasetCell? cell, DatasetColumnType type) => type switch
    {
        DatasetColumnType.Int or DatasetColumnType.Double => cell?.NumberValue,
        DatasetColumnType.DateTime => cell?.DateValue?.Ticks,
        DatasetColumnType.Bool => cell?.BoolValue,
        _ => cell?.StringValue?.Trim(),
    };

    /// <summary>The derived header for a measure — "Count", else "&lt;Aggregate&gt; of &lt;Column&gt;".</summary>
    private static string MeasureLabel(Aggregate aggregate, DatasetColumn? column) => aggregate switch
    {
        Aggregate.Count => "Count",
        Aggregate.Sum => $"Sum of {column?.Name}",
        Aggregate.Average => $"Average of {column?.Name}",
        Aggregate.Min => $"Min of {column?.Name}",
        Aggregate.Max => $"Max of {column?.Name}",
        _ => column?.Name ?? "Value",
    };
}
