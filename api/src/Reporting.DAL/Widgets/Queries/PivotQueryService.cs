using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Rows shaped for a pivot / aggregation table: filtered, then grouped by the row fields (nested left
/// to right) and optionally spread across the column fields, with each cell reduced to one value per
/// measure. Because the cells are an EAV table, the needed cells are streamed back (capped) and grouped
/// in memory into a tree of row groups (see <see cref="PivotNode"/>), which yields detail rows,
/// subtotals, row totals and the grand total from one pass. Values come back already formatted.
/// </summary>
public class PivotQueryService(ReportingDbContext db, DatasetResolver resolver)
{
    /// <summary>
    /// Ceiling on rows scanned for one pivot query. Every row must be pulled to be grouped and
    /// reduced in memory, so a runaway dataset is capped here; the response flags that it happened.
    /// </summary>
    public const int MaxPivotScanRows = ScanCapping.MaxScanRows;

    /// <summary>Ceiling on the number of grouped rows a pivot returns, so a high-cardinality dimension
    /// can't fan out into an unbounded table. Totals still reduce every scanned row.</summary>
    public const int MaxPivotRows = 2_000;

    /// <summary>Ceiling on column-field combinations spread across the top, for the same reason.</summary>
    public const int MaxPivotColumns = 100;

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

        // Fields in request order; an unknown column id simply drops out, and a column used as a row
        // field isn't spread across the top as well.
        var groupings = dto.FieldGroupings
            .GroupBy(g => g.ColumnId)
            .ToDictionary(g => g.Key, g => g.Last().Grouping);
        List<PivotField> Fields(IEnumerable<Guid> ids) => ids
            .Distinct()
            .Select(columnRef => columnsByRef.GetValueOrDefault(columnRef))
            .OfType<DatasetColumn>()
            .Select(c => new PivotField(c, groupings.TryGetValue(c.RefId, out var g) ? g : null))
            .ToList();
        var rowFields = Fields(dto.RowFields);
        var rowFieldIds = rowFields.Select(f => f.Column.RefId).ToHashSet();
        var columnFields = Fields(dto.ColumnFields.Where(c => !rowFieldIds.Contains(c)));

        // Measures in request order — Count needs no column; every other aggregate needs a resolvable one.
        var measures = dto.Measures
            .Select((m, i) => new PivotMeasurePlan(
                i, m.Aggregate, m.ShowAs, m.Label,
                m.Aggregate == PivotAggregate.Count ? null : columnsByRef.GetValueOrDefault(m.ColumnId ?? Guid.Empty)))
            .Where(m => m.Aggregate == PivotAggregate.Count || m.Column is not null)
            .ToList();

        // Nothing to reduce yet (no valid measure): a graceful empty result, like the charts give.
        if (measures.Count == 0)
        {
            return result;
        }

        result.RowFields = rowFields.Select(Field).ToList();
        result.ColumnFields = columnFields.Select(Field).ToList();
        result.Measures = measures.Select(MeasureColumn).ToList();

        // Pull only the cells the pivot reads, capped so a runaway dataset can't be dragged into memory wholesale.
        var neededIds = new HashSet<int>(rowFields.Concat(columnFields).Select(f => f.Column.Id));
        foreach (var measure in measures)
        {
            if (measure.Column is not null)
            {
                neededIds.Add(measure.Column.Id);
            }
        }

        // Streamed rather than buffered: each row is folded into the tree as it arrives and then
        // dropped, so memory holds the groups, not the rows.
        var rows = RowCellStream.ReadAsync(matching, neededIds, MaxPivotScanRows);
        result.ScanTruncated = result.MatchedRowCount > MaxPivotScanRows;

        var root = new PivotNode(null, 0, string.Empty, null, measures);
        var columnKeys = new Dictionary<string, PivotColumnKey>();

        await foreach (var cells in rows)
        {
            result.ScannedRowCount++;
            var inputs = measures.Select(m => MeasureInput(m, cells)).ToArray();

            // The column key: every column field's value, joined by a control character (never found in
            // real cell text) so two combinations can't collide by their values running together.
            string? columnKey = null;
            if (columnFields.Count > 0)
            {
                var keyCells = columnFields.Select(f => cells.GetValueOrDefault(f.Column.Id)).ToArray();
                var values = columnFields.Select((f, i) => f.Read(keyCells[i])).ToArray();
                columnKey = string.Join('\u0001', values.Select(v => v.Display));
                if (!columnKeys.TryGetValue(columnKey, out var key))
                {
                    key = new PivotColumnKey(columnKey, values.Select(v => v.Display).ToArray(), values.Select(v => v.SortKey).ToArray());
                    columnKeys[columnKey] = key;
                }
                for (var i = 0; i < values.Length; i++)
                {
                    key.Trackers[i].Add(keyCells[i], values[i]);
                }
            }

            var node = root;
            Accumulate(node, columnKey, inputs, measures);
            for (var depth = 0; depth < rowFields.Count; depth++)
            {
                var field = rowFields[depth];
                var cell = cells.GetValueOrDefault(field.Column.Id);
                var value = field.Read(cell);
                if (!node.Children.TryGetValue(value.Display, out var child))
                {
                    child = new PivotNode(node, depth + 1, value.Display, value.SortKey, measures);
                    node.Children[value.Display] = child;
                }
                child.Tracker.Add(cell, value);
                Accumulate(child, columnKey, inputs, measures);
                node = child;
            }
        }

        // The column keys across the top, in their fields' natural order, capped.
        var columnTypes = columnFields.Select(f => f.Column.Type).ToList();
        var orderedKeys = columnKeys.Values
            .OrderBy(k => k.SortKeys, Comparer<object?[]>.Create((a, b) => PivotKeyComparison.Compare(a, b, columnTypes)))
            .ToList();
        result.ColumnsTruncated = orderedKeys.Count > MaxPivotColumns;
        var shownKeys = orderedKeys.Take(MaxPivotColumns).ToList();
        result.ColumnKeys = shownKeys
            .Select(k => new PivotColumnKeyDto { Labels = k.Displays.ToList(), Drill = ColumnDrill(k, columnFields) })
            .ToList();
        result.HasRowTotals = columnFields.Count > 0 && dto.ShowGrandTotal;

        var layout = new Layout(root, measures, columnFields.Count > 0, shownKeys.Select(k => k.Key).ToList(), result.HasRowTotals, rowFields);
        var ordered = OrderRows(root, rowFields, measures, dto, out var leafCount);
        result.RowsTruncated = leafCount > MaxPivotRows;
        result.Rows = ordered.Select(layout.Row).ToList();

        if (dto.ShowGrandTotal && rowFields.Count > 0)
        {
            var total = layout.Row(root);
            total.Dimensions = Enumerable.Range(0, rowFields.Count).Select(i => i == 0 ? "Total" : string.Empty).ToList();
            total.IsGrandTotal = true;
            result.GrandTotal = total;
        }

        result.Truncated = result.ScanTruncated || result.RowsTruncated || result.ColumnsTruncated;
        return result;
    }

    /// <summary>
    /// The rows to show, in order. With subtotals (and two or more row fields) the tree is walked
    /// group by group, each outer group's subtotal heading its children and siblings ordered within
    /// their parent. Otherwise the detail rows are ordered as one flat list, so a measure sort is a
    /// genuine top-N across every group. Either way at most <see cref="MaxPivotRows"/> detail rows are kept.
    /// </summary>
    private static List<PivotNode> OrderRows(
        PivotNode root, List<PivotField> rowFields, List<PivotMeasurePlan> measures, PivotQueryDto dto, out int leafCount)
    {
        var types = rowFields.Select(f => f.Column.Type).ToList();
        var sortMeasure = dto.SortMeasureIndex is { } requested ? measures.FindIndex(m => m.Index == requested) : -1;
        var sortField = sortMeasure < 0 && dto.SortRowFieldIndex is { } f && f >= 0 && f < rowFields.Count ? f : -1;
        var descending = dto.SortDescending;

        // A measure sort reads the value the reader sees (after any "show as"); no value sinks last.
        double MeasureKey(PivotNode node) =>
            ShownValue(node, node.Total, root.Total, node.Parent?.Total ?? node.Total, measures[sortMeasure], sortMeasure)
            ?? (descending ? double.NegativeInfinity : double.PositiveInfinity);

        if (rowFields.Count == 0)
        {
            leafCount = 1;
            return [root];
        }

        if (!dto.ShowSubtotals || rowFields.Count < 2)
        {
            var leaves = new List<PivotNode>();
            CollectLeaves(root, rowFields.Count, leaves);
            leafCount = leaves.Count;

            var byDimensions = Comparer<PivotNode>.Create((a, b) =>
            {
                var left = Keys(a);
                var right = Keys(b);
                if (sortField >= 0)
                {
                    var first = PivotKeyComparison.Compare(left[sortField], right[sortField], types[sortField]);
                    if (first != 0)
                    {
                        // Blanks stay last whichever way the field is sorted.
                        return descending && left[sortField] is not null && right[sortField] is not null ? -first : first;
                    }
                }
                return PivotKeyComparison.Compare(left, right, types);
            });

            IEnumerable<PivotNode> sorted = sortMeasure >= 0
                ? (descending ? leaves.OrderByDescending(MeasureKey) : leaves.OrderBy(MeasureKey)).ThenBy(n => n, byDimensions)
                : leaves.OrderBy(n => n, byDimensions);
            return sorted.Take(MaxPivotRows).ToList();
        }

        var ordered = new List<PivotNode>();
        var shown = 0;
        var total = 0;

        void Walk(PivotNode parent)
        {
            var level = parent.Depth;
            var type = types[level];
            var byKey = Comparer<PivotNode>.Create((a, b) =>
            {
                var order = PivotKeyComparison.Compare(a.SortKey, b.SortKey, type);
                return level == sortField && descending && a.SortKey is not null && b.SortKey is not null ? -order : order;
            });
            var children = parent.Children.Values;
            var sorted = sortMeasure >= 0
                ? (descending ? children.OrderByDescending(MeasureKey) : children.OrderBy(MeasureKey)).ThenBy(n => n, byKey)
                : children.OrderBy(n => n, byKey);

            foreach (var child in sorted)
            {
                if (child.Depth == rowFields.Count)
                {
                    total++;
                    if (shown < MaxPivotRows)
                    {
                        ordered.Add(child);
                        shown++;
                    }
                    continue;
                }
                // The subtotal heads its group, so it's shown whenever its first detail row still fits.
                if (shown < MaxPivotRows)
                {
                    ordered.Add(child);
                }
                Walk(child);
            }
        }

        Walk(root);
        leafCount = total;
        return ordered;
    }

    private static void CollectLeaves(PivotNode node, int depth, List<PivotNode> leaves)
    {
        if (node.Depth == depth)
        {
            leaves.Add(node);
            return;
        }
        foreach (var child in node.Children.Values)
        {
            CollectLeaves(child, depth, leaves);
        }
    }

    /// <summary>A node's sort keys from the outermost field down.</summary>
    private static object?[] Keys(PivotNode node)
    {
        var keys = new object?[node.Depth];
        for (var current = node; current.Parent is not null; current = current.Parent)
        {
            keys[current.Depth - 1] = current.SortKey;
        }
        return keys;
    }

    /// <summary>Lays rows out as the client renders them: dimensions, then each column key's measures, then the row totals.</summary>
    private sealed class Layout(
        PivotNode root, List<PivotMeasurePlan> measures, bool spread, List<string> columnKeys, bool rowTotals, List<PivotField> rowFields)
    {
        public PivotRowDto Row(PivotNode node)
        {
            var values = new List<PivotCellDto>();
            var parent = node.Parent ?? node;
            foreach (var key in spread ? columnKeys : [])
            {
                var cell = node.ByColumn.GetValueOrDefault(key);
                var rootCell = root.ByColumn.GetValueOrDefault(key);
                var parentCell = parent.ByColumn.GetValueOrDefault(key);
                values.AddRange(measures.Select((m, i) => Cell(node, cell, rootCell, parentCell, m, i)));
            }
            // Without column fields the row's own values are its whole-group ones; with them, they're the row totals.
            if (!spread || rowTotals)
            {
                values.AddRange(measures.Select((m, i) => Cell(node, node.Total, root.Total, parent.Total, m, i)));
            }

            var path = node.Path();
            var isSubtotal = node.Depth > 0 && node.Depth < rowFields.Count;
            while (path.Count < rowFields.Count)
            {
                path.Add(string.Empty);
            }

            return new PivotRowDto
            {
                Dimensions = path,
                Values = values,
                IsSubtotal = isSubtotal,
                Depth = node.Depth,
                Drill = RowDrill(node, rowFields),
            };
        }
    }

    /// <summary>Adds one row to a node, as a whole and within its column key.</summary>
    private static void Accumulate(PivotNode node, string? columnKey, PivotMeasureInput[] inputs, List<PivotMeasurePlan> measures)
    {
        node.Total.Add(inputs);
        if (columnKey is null)
        {
            return;
        }
        if (!node.ByColumn.TryGetValue(columnKey, out var cell))
        {
            cell = new PivotCellAcc(measures);
            node.ByColumn[columnKey] = cell;
        }
        cell.Add(inputs);
    }

    /// <summary>One row's input to a measure: its number, and for a distinct count its trimmed text.</summary>
    private static PivotMeasureInput MeasureInput(PivotMeasurePlan measure, Dictionary<int, DatasetCell> cells)
    {
        if (measure.Column is null)
        {
            return default; // Count reads only the row tally.
        }
        var cell = cells.GetValueOrDefault(measure.Column.Id);
        if (measure.Aggregate == PivotAggregate.CountDistinct)
        {
            var text = cell?.StringValue?.Trim();
            return new PivotMeasureInput(null, string.IsNullOrEmpty(text) ? null : text);
        }
        return new PivotMeasureInput(cell?.NumberValue, null);
    }

    /// <summary>One measure's reduced value for a cell, before any "show as".</summary>
    private static double? RawValue(PivotCellAcc? cell, PivotMeasurePlan measure, int index)
    {
        if (cell is null || cell.RowCount == 0)
        {
            return null;
        }
        var acc = cell.Measures[index];
        return measure.Aggregate switch
        {
            PivotAggregate.Count => cell.RowCount,
            PivotAggregate.CountDistinct => acc.Distinct!.Count,
            PivotAggregate.Sum => acc.Count > 0 ? acc.Sum : null,
            PivotAggregate.Average => acc.Count > 0 ? acc.Sum / acc.Count : null,
            PivotAggregate.Min => acc.Count > 0 ? acc.Min : null,
            PivotAggregate.Max => acc.Count > 0 ? acc.Max : null,
            PivotAggregate.Median => acc.Count > 0 ? Median(acc.Values!) : null,
            _ => null,
        };
    }

    private static double Median(List<double> values)
    {
        var sorted = values.Order().ToList();
        var middle = sorted.Count / 2;
        return sorted.Count % 2 == 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    }

    /// <summary>The value shown for a cell: the reduced value, or its share of the total or of the enclosing group.</summary>
    private static double? ShownValue(
        PivotNode node, PivotCellAcc? cell, PivotCellAcc? totalCell, PivotCellAcc? parentCell, PivotMeasurePlan measure, int index)
    {
        var value = RawValue(cell, measure, index);
        if (measure.ShowAs == PivotShowAs.Value || value is not { } v)
        {
            return value;
        }
        var denominator = measure.ShowAs == PivotShowAs.PercentOfTotal
            ? RawValue(totalCell, measure, index)
            : RawValue(node.Parent is null ? cell : parentCell, measure, index);
        return denominator is { } d && d != 0 ? v / d : null;
    }

    /// <summary>One measure's cell, reduced and formatted for display.</summary>
    private static PivotCellDto Cell(
        PivotNode node, PivotCellAcc? cell, PivotCellAcc? totalCell, PivotCellAcc? parentCell, PivotMeasurePlan measure, int index)
    {
        if (ShownValue(node, cell, totalCell, parentCell, measure, index) is not { } v)
        {
            return new PivotCellDto { Value = null, DisplayValue = null };
        }
        if (measure.ShowAs != PivotShowAs.Value)
        {
            return new PivotCellDto { Value = v, DisplayValue = (v * 100).ToString("0.0", CultureInfo.InvariantCulture) + "%" };
        }

        // Counts are plain tallies (no column formatting); every other aggregate carries the measure
        // column's own numeric formatting, so £/mm suffixes and decimals come through.
        var tally = measure.Aggregate is PivotAggregate.Count or PivotAggregate.CountDistinct;
        var config = tally ? null : measure.Column?.GetConfig() as NumericColumnConfig;
        return new PivotCellDto { Value = v, DisplayValue = CellFormatter.Number(v, config) };
    }

    /// <summary>Conditions selecting a row's rows: every row field down to its depth. Null if any can't be expressed.</summary>
    private static FilterGroupDto? RowDrill(PivotNode node, List<PivotField> rowFields)
    {
        if (node.Parent is null)
        {
            return new FilterGroupDto();
        }
        var conditions = new List<FilterNodeDto>();
        for (var current = node; current.Parent is not null; current = current.Parent)
        {
            if (current.Tracker.Conditions(rowFields[current.Depth - 1]) is not { } own)
            {
                return null;
            }
            conditions.InsertRange(0, own);
        }
        return new FilterGroupDto { Join = FilterJoin.And, Children = conditions };
    }

    private static FilterGroupDto? ColumnDrill(PivotColumnKey key, List<PivotField> columnFields)
    {
        var conditions = new List<FilterNodeDto>();
        for (var i = 0; i < columnFields.Count; i++)
        {
            if (key.Trackers[i].Conditions(columnFields[i]) is not { } own)
            {
                return null;
            }
            conditions.AddRange(own);
        }
        return new FilterGroupDto { Join = FilterJoin.And, Children = conditions };
    }

    private static PivotFieldDto Field(PivotField field) => new() { ColumnId = field.Column.RefId, Label = FieldLabel(field) };

    /// <summary>A field's header: its column name, with the period when grouped ("Made (month)").</summary>
    private static string FieldLabel(PivotField field) =>
        field.Grouping is { } grouping ? $"{field.Column.Name} ({grouping.ToString().ToLowerInvariant()})" : field.Column.Name;

    /// <summary>The client-facing column header for one measure: its key, label, source column, and aggregate.</summary>
    private static PivotMeasureColumnDto MeasureColumn(PivotMeasurePlan measure) => new()
    {
        Key = $"m{measure.Index}",
        Label = string.IsNullOrWhiteSpace(measure.Label) ? MeasureLabel(measure) : measure.Label,
        ColumnId = measure.Column?.RefId,
        Aggregate = measure.Aggregate,
        ShowAs = measure.ShowAs,
    };

    /// <summary>The derived header for a measure — "Count", else "&lt;Aggregate&gt; of &lt;Column&gt;", plus any "show as".</summary>
    private static string MeasureLabel(PivotMeasurePlan measure)
    {
        var name = measure.Column?.Name;
        var label = measure.Aggregate switch
        {
            PivotAggregate.Count => "Count",
            PivotAggregate.CountDistinct => $"Distinct {name}",
            PivotAggregate.Sum => $"Sum of {name}",
            PivotAggregate.Average => $"Average of {name}",
            PivotAggregate.Min => $"Min of {name}",
            PivotAggregate.Max => $"Max of {name}",
            PivotAggregate.Median => $"Median of {name}",
            _ => name ?? "Value",
        };
        return measure.ShowAs switch
        {
            PivotShowAs.PercentOfTotal => $"{label} (% of total)",
            PivotShowAs.PercentOfParent => $"{label} (% of parent)",
            _ => label,
        };
    }
}
