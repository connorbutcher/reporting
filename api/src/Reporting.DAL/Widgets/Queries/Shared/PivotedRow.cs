namespace Reporting.DAL.Widgets;

/// <summary>
/// One dataset row with up to eight of its cells turned into columns by <see cref="CellPivot"/>:
/// slot <c>n</c> holds the stored text (<c>Tn</c>), number (<c>Nn</c>) and date (<c>Dn</c>) of the
/// n-th requested column. A slot whose column the row has no cell for reads as null.
/// </summary>
public sealed class PivotedRow
{
    public int RowId { get; set; }

    public string? T0 { get; set; }
    public double? N0 { get; set; }
    public DateTime? D0 { get; set; }

    public string? T1 { get; set; }
    public double? N1 { get; set; }
    public DateTime? D1 { get; set; }

    public string? T2 { get; set; }
    public double? N2 { get; set; }
    public DateTime? D2 { get; set; }

    public string? T3 { get; set; }
    public double? N3 { get; set; }
    public DateTime? D3 { get; set; }

    public string? T4 { get; set; }
    public double? N4 { get; set; }
    public DateTime? D4 { get; set; }

    public string? T5 { get; set; }
    public double? N5 { get; set; }
    public DateTime? D5 { get; set; }

    public string? T6 { get; set; }
    public double? N6 { get; set; }
    public DateTime? D6 { get; set; }

    public string? T7 { get; set; }
    public double? N7 { get; set; }
    public DateTime? D7 { get; set; }
}
