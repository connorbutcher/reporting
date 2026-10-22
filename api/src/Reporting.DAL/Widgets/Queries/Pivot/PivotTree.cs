using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>Groups scanned rows into the row tree, reducing each node as a whole and per column key in one pass.</summary>
internal sealed class PivotTree(List<PivotField> rowFields, List<PivotField> columnFields, List<PivotMeasurePlan> measures)
{
    public PivotNode Root { get; } = new(null, 0, string.Empty, null, measures);

    public Dictionary<string, PivotColumnKey> ColumnKeys { get; } = new();

    public void Add(DatasetRow row)
    {
        var cells = row.Cells.ToDictionary(c => c.ColumnId);
        var inputs = measures.Select(m => MeasureInput(m, cells)).ToArray();
        var columnKey = columnFields.Count > 0 ? TrackColumnKey(cells) : null;

        var node = Root;
        Accumulate(node, columnKey, inputs);
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
            Accumulate(child, columnKey, inputs);
            node = child;
        }
    }

    /// <summary>Joined by a control character never found in cell text, so combinations can't collide.</summary>
    private string TrackColumnKey(Dictionary<int, DatasetCell> cells)
    {
        var keyCells = columnFields.Select(f => cells.GetValueOrDefault(f.Column.Id)).ToArray();
        var values = columnFields.Select((f, i) => f.Read(keyCells[i])).ToArray();
        var columnKey = string.Join('\u0001', values.Select(v => v.Display));
        if (!ColumnKeys.TryGetValue(columnKey, out var key))
        {
            key = new PivotColumnKey(columnKey, values.Select(v => v.Display).ToArray(), values.Select(v => v.SortKey).ToArray());
            ColumnKeys[columnKey] = key;
        }
        for (var i = 0; i < values.Length; i++)
        {
            key.Trackers[i].Add(keyCells[i], values[i]);
        }
        return columnKey;
    }

    private void Accumulate(PivotNode node, string? columnKey, PivotMeasureInput[] inputs)
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

    /// <summary>The row's number for a measure, or for a distinct count its trimmed text. Count reads only the tally.</summary>
    private static PivotMeasureInput MeasureInput(PivotMeasurePlan measure, Dictionary<int, DatasetCell> cells)
    {
        if (measure.Column is null)
        {
            return default;
        }
        var cell = cells.GetValueOrDefault(measure.Column.Id);
        if (measure.Aggregate == PivotAggregate.CountDistinct)
        {
            var text = cell?.StringValue?.Trim();
            return new PivotMeasureInput(null, string.IsNullOrEmpty(text) ? null : text);
        }
        return new PivotMeasureInput(cell?.NumberValue, null);
    }
}
