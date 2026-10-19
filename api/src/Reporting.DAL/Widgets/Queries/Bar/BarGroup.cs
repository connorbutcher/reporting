namespace Reporting.DAL.Widgets;

/// <summary>
/// One SQL group of a bar chart's rows: a typed category value and series, and every reduction the
/// chart could need. Carrying count, sum, min and max (rather than one aggregate) lets groups be merged
/// afterwards — into a date period, or the "Other" category — without losing an average.
/// </summary>
public sealed class BarGroup
{
    public string Text { get; set; } = "";
    public double? Number { get; set; }
    public DateTime? Date { get; set; }
    public string Series { get; set; } = "";
    public int Count { get; set; }
    public double? Sum { get; set; }
    public double? Min { get; set; }
    public double? Max { get; set; }
}
