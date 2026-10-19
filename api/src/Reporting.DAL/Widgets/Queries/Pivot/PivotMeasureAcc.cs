namespace Reporting.DAL.Widgets;

/// <summary>
/// A running reduction of one measure within one pivot cell: enough to yield sum, count, average,
/// min and max, plus the values themselves for a median and the distinct keys for a distinct count
/// (each kept only when the measure needs it).
/// </summary>
public sealed class PivotMeasureAcc(bool keepValues, bool keepDistinct)
{
    public double Sum { get; private set; }
    public int Count { get; private set; }
    public double Min { get; private set; } = double.MaxValue;
    public double Max { get; private set; } = double.MinValue;
    public List<double>? Values { get; } = keepValues ? new List<double>() : null;
    public HashSet<string>? Distinct { get; } = keepDistinct ? new HashSet<string>(StringComparer.OrdinalIgnoreCase) : null;

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
        Values?.Add(value);
    }

    public void AddDistinct(string key) => Distinct?.Add(key);
}
