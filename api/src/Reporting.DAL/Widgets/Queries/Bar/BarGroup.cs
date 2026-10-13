namespace Reporting.DAL.Widgets;

/// <summary>One aggregated bar: a category/series pair, its reduced value, and the sort key carried through.</summary>
public sealed class BarGroup
{
    public string Category { get; set; } = "";
    public string Series { get; set; } = "";
    public double? SortNumber { get; set; }
    public DateTime? SortDate { get; set; }
    public double? Value { get; set; }
}
