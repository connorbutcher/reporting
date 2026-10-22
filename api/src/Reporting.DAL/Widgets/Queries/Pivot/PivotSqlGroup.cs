namespace Reporting.DAL.Widgets;

/// <summary>
/// One group of a pivot reduced in SQL: the field cells its rows share (in <see cref="Key"/>'s slots),
/// how many rows it holds, and one measure column's count, sum, minimum and maximum over them.
/// </summary>
public sealed class PivotSqlGroup
{
    public PivotedRow Key { get; set; } = new();
    public int Rows { get; set; }
    public int Count { get; set; }
    public double? Sum { get; set; }
    public double? Min { get; set; }
    public double? Max { get; set; }
}
