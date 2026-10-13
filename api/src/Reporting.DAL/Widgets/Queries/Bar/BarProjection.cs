namespace Reporting.DAL.Widgets;

/// <summary>One dataset row pivoted to the scalars a bar chart groups on: its category
/// (blank collapsed to ""), a typed sort key for that category, its series, and its measure.</summary>
public sealed class BarProjection
{
    public string Category { get; set; } = "";
    public double? SortNumber { get; set; }
    public DateTime? SortDate { get; set; }
    public string Series { get; set; } = "";
    public double? Value { get; set; }
}
