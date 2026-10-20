namespace Reporting.DAL.Widgets;

/// <summary>One dataset row pivoted to the scalars a bar chart groups on: its category (trimmed text
/// for a text column, else the typed number or date), its series, and its measure.</summary>
public sealed class BarProjection
{
    public string Text { get; set; } = "";
    public double? Number { get; set; }
    public DateTime? Date { get; set; }
    public string Series { get; set; } = "";
    public double? Value { get; set; }
}
