using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// The rows to show, in order, keeping at most <see cref="PivotQueryService.MaxPivotRows"/> detail rows. With
/// subtotals the tree is walked group by group, each subtotal heading its children; otherwise the detail rows
/// are ordered as one flat list, so a measure sort is a true top-N across every group.
/// </summary>
internal sealed class PivotRowOrder
{
    private readonly PivotNode _root;
    private readonly List<PivotField> _rowFields;
    private readonly List<PivotMeasurePlan> _measures;
    private readonly List<DatasetColumnType> _types;
    private readonly int _sortMeasure;
    private readonly int _sortField;
    private readonly bool _descending;
    private readonly List<PivotNode> _ordered = new();
    private int _shown;
    private int _leafCount;

    private PivotRowOrder(PivotNode root, List<PivotField> rowFields, List<PivotMeasurePlan> measures, PivotQueryDto dto)
    {
        _root = root;
        _rowFields = rowFields;
        _measures = measures;
        _types = rowFields.Select(f => f.Column.Type).ToList();
        _sortMeasure = dto.SortMeasureIndex is { } requested ? measures.FindIndex(m => m.Index == requested) : -1;
        _sortField = _sortMeasure < 0 && dto.SortRowFieldIndex is { } f && f >= 0 && f < rowFields.Count ? f : -1;
        _descending = dto.SortDescending;
    }

    public static List<PivotNode> Order(
        PivotNode root, List<PivotField> rowFields, List<PivotMeasurePlan> measures, PivotQueryDto dto, out int leafCount)
    {
        if (rowFields.Count == 0)
        {
            leafCount = 1;
            return [root];
        }

        var order = new PivotRowOrder(root, rowFields, measures, dto);
        var rows = !dto.ShowSubtotals || rowFields.Count < 2 ? order.Flat() : order.Grouped();
        leafCount = order._leafCount;
        return rows;
    }

    private List<PivotNode> Flat()
    {
        var leaves = new List<PivotNode>();
        CollectLeaves(_root, _rowFields.Count, leaves);
        _leafCount = leaves.Count;

        var byDimensions = Comparer<PivotNode>.Create(CompareDimensions);
        IEnumerable<PivotNode> sorted = _sortMeasure >= 0
            ? (_descending ? leaves.OrderByDescending(MeasureKey) : leaves.OrderBy(MeasureKey)).ThenBy(n => n, byDimensions)
            : leaves.OrderBy(n => n, byDimensions);
        return sorted.Take(PivotQueryService.MaxPivotRows).ToList();
    }

    private List<PivotNode> Grouped()
    {
        Walk(_root);
        return _ordered;
    }

    private void Walk(PivotNode parent)
    {
        var level = parent.Depth;
        var byKey = Comparer<PivotNode>.Create((a, b) => CompareSiblings(a, b, level));
        var children = parent.Children.Values;
        var sorted = _sortMeasure >= 0
            ? (_descending ? children.OrderByDescending(MeasureKey) : children.OrderBy(MeasureKey)).ThenBy(n => n, byKey)
            : children.OrderBy(n => n, byKey);

        foreach (var child in sorted)
        {
            if (child.Depth == _rowFields.Count)
            {
                _leafCount++;
                if (_shown < PivotQueryService.MaxPivotRows)
                {
                    _ordered.Add(child);
                    _shown++;
                }
                continue;
            }
            // The subtotal heads its group, so it's shown whenever its first detail row still fits.
            if (_shown < PivotQueryService.MaxPivotRows)
            {
                _ordered.Add(child);
            }
            Walk(child);
        }
    }

    /// <summary>Reads the value as shown (after any "show as"); a missing value sinks last.</summary>
    private double MeasureKey(PivotNode node)
    {
        return PivotValues.Shown(node, node.Total, _root.Total, node.Parent?.Total ?? node.Total, _measures[_sortMeasure], _sortMeasure)
            ?? (_descending ? double.NegativeInfinity : double.PositiveInfinity);
    }

    private int CompareDimensions(PivotNode a, PivotNode b)
    {
        var left = Keys(a);
        var right = Keys(b);
        if (_sortField >= 0)
        {
            var first = PivotKeyComparison.Compare(left[_sortField], right[_sortField], _types[_sortField]);
            if (first != 0)
            {
                // Blanks stay last whichever way the field is sorted.
                return _descending && left[_sortField] is not null && right[_sortField] is not null ? -first : first;
            }
        }
        return PivotKeyComparison.Compare(left, right, _types);
    }

    private int CompareSiblings(PivotNode a, PivotNode b, int level)
    {
        var order = PivotKeyComparison.Compare(a.SortKey, b.SortKey, _types[level]);
        return level == _sortField && _descending && a.SortKey is not null && b.SortKey is not null ? -order : order;
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

    /// <summary>Sort keys from the outermost field down.</summary>
    private static object?[] Keys(PivotNode node)
    {
        var keys = new object?[node.Depth];
        for (var current = node; current.Parent is not null; current = current.Parent)
        {
            keys[current.Depth - 1] = current.SortKey;
        }
        return keys;
    }
}
