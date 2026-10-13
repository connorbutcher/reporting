namespace Reporting.DAL.Widgets;

/// <summary>A running reduction of one measure within a group: enough to yield sum, count, average, min, and max.</summary>
public sealed class PivotMeasureAcc
{
    public double Sum { get; private set; }
    public int Count { get; private set; }
    public double Min { get; private set; } = double.MaxValue;
    public double Max { get; private set; } = double.MinValue;

    public void Add(double value)
    {
        Sum += value;
        Count++;
        if (value < Min)
        {
            Min = value;
        }
        if (value > Max)
        {
            Max = value;
        }
    }
}
