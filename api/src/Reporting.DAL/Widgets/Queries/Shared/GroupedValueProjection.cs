namespace Reporting.DAL.Widgets;

/// <summary>
/// One dataset row pivoted to the scalars a box-plot or Xbar-R chart groups on: its category
/// (blank collapsed to ""), a typed sort key for that category, its series (unused by Xbar-R,
/// which has none), and its measure.
/// </summary>
public sealed class GroupedValueProjection
{
    public string Category { get; set; } = "";
    public double? SortNumber { get; set; }
    public DateTime? SortDate { get; set; }
    public string Series { get; set; } = "";
    public double Value { get; set; }
}
