namespace Reporting.DAL.Widgets;

/// <summary>
/// One dataset row pivoted to the scalars a box-plot or Xbar-R chart groups on: its category
/// (keyed by typed value, blank as ""), its series (unused by Xbar-R, which has none), and its measure.
/// </summary>
public sealed class GroupedValueProjection
{
    public ChartCategory CategoryValue { get; set; } = ChartCategory.Blank;
    public string Category => CategoryValue.Key;
    public string Series { get; set; } = "";
    public double Value { get; set; }
}
