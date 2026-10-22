namespace Reporting.DAL.Widgets;

/// <summary>One combination of column-field values: its displays, typed sort keys, and what each field held.</summary>
public sealed class PivotColumnKey(string key, string[] displays, object?[] sortKeys)
{
    public string Key { get; } = key;
    public string[] Displays { get; } = displays;
    public object?[] SortKeys { get; } = sortKeys;
    public PivotDimensionTracker[] Trackers { get; } = displays.Select(_ => new PivotDimensionTracker()).ToArray();
}
