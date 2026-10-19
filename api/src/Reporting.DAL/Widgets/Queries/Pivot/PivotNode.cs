namespace Reporting.DAL.Widgets;

/// <summary>
/// A node of the pivot's row tree: the root is every scanned row (the grand total); each level below
/// splits its parent by the next row field, so a node at depth d is one group of the first d fields.
/// Every node reduces its rows as a whole (<see cref="Total"/>) and per column key (<see cref="ByColumn"/>),
/// which yields detail rows, subtotals, row totals and the grand total from one pass.
/// </summary>
public sealed class PivotNode(PivotNode? parent, int depth, string display, object? sortKey, IReadOnlyList<PivotMeasurePlan> measures)
{
    public PivotNode? Parent { get; } = parent;
    public int Depth { get; } = depth;

    /// <summary>This node's own dimension value (the field at <c>Depth - 1</c>); blank for the root.</summary>
    public string Display { get; } = display;
    public object? SortKey { get; } = sortKey;

    public Dictionary<string, PivotNode> Children { get; } = new();
    public PivotCellAcc Total { get; } = new(measures);
    public Dictionary<string, PivotCellAcc> ByColumn { get; } = new();

    /// <summary>What this node's own dimension held, so drill-through can select the same rows.</summary>
    public PivotDimensionTracker Tracker { get; } = new();

    /// <summary>The dimension values from the outermost field down to this node's own.</summary>
    public List<string> Path()
    {
        var path = new List<string>(Depth);
        for (var node = this; node.Parent is not null; node = node.Parent)
        {
            path.Add(node.Display);
        }
        path.Reverse();
        return path;
    }
}

/// <summary>One combination of column-field values: its displays, typed sort keys, and what each field held.</summary>
public sealed class PivotColumnKey(string key, string[] displays, object?[] sortKeys)
{
    public string Key { get; } = key;
    public string[] Displays { get; } = displays;
    public object?[] SortKeys { get; } = sortKeys;
    public PivotDimensionTracker[] Trackers { get; } = displays.Select(_ => new PivotDimensionTracker()).ToArray();
}
