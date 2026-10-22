namespace Reporting.Abstractions;

public class PivotRowDto
{
    /// <summary>
    /// The formatted dimension values, one per row field in order; empty for a total-only pivot. A
    /// subtotal row fills only its own and outer dimensions, leaving the inner ones blank.
    /// </summary>
    public List<string> Dimensions { get; set; } = new();

    /// <summary>
    /// The measure values. Without column fields, one per measure in request order. With them, one
    /// block of measures per <see cref="PivotQueryResultDto.ColumnKeys"/> entry, then (when
    /// <see cref="PivotQueryResultDto.HasRowTotals"/>) a final block of the row's totals.
    /// </summary>
    public List<PivotCellDto> Values { get; set; } = new();

    /// <summary>True for the grand-total row, so the client can style it apart.</summary>
    public bool IsGrandTotal { get; set; }

    /// <summary>True for a subtotal row heading an outer group.</summary>
    public bool IsSubtotal { get; set; }

    /// <summary>How many row fields this row is grouped by: all of them for a detail row, fewer for a subtotal.</summary>
    public int Depth { get; set; }

    /// <summary>Conditions selecting the rows behind this row, for drill-through; null when they can't be expressed.</summary>
    public FilterGroupDto? Drill { get; set; }
}
