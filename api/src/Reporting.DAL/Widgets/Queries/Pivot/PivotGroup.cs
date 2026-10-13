namespace Reporting.DAL.Widgets;

/// <summary>One pivot group: its dimension display values, their typed sort keys, and one accumulator per measure.</summary>
public sealed class PivotGroup
{
    public string[] Displays { get; }
    public object?[] SortKeys { get; }
    public PivotMeasureAcc[] Measures { get; }
    public int RowCount { get; set; }

    public PivotGroup(string[] displays, object?[] sortKeys, int measureCount)
    {
        Displays = displays;
        SortKeys = sortKeys;
        Measures = new PivotMeasureAcc[measureCount];
        for (var i = 0; i < measureCount; i++)
        {
            Measures[i] = new PivotMeasureAcc();
        }
    }
}
