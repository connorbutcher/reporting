namespace Reporting.Abstractions;

public class PivotQueryDto
{
    public FilterGroupDto? Filter { get; set; }

    /// <summary>The columns rows are grouped by, in order — each becomes a dimension column, nested left to right.</summary>
    public List<Guid> RowFields { get; set; } = new();

    /// <summary>
    /// The columns spread across the top, in order: each distinct combination of their values becomes a
    /// group of value columns, one per measure. Empty gives one value column per measure.
    /// </summary>
    public List<Guid> ColumnFields { get; set; } = new();

    /// <summary>Date fields (row or column) grouped by period rather than by exact value.</summary>
    public List<PivotFieldGroupingDto> FieldGroupings { get; set; } = new();

    /// <summary>The value columns computed for each group — one output column per measure, in order.</summary>
    public List<PivotMeasureDto> Measures { get; set; } = new();

    /// <summary>
    /// Index into <see cref="Measures"/> to order the rows by that measure's value; null orders by
    /// the dimension keys. Applied before the row cap, so it yields a genuine top-N.
    /// </summary>
    public int? SortMeasureIndex { get; set; }

    /// <summary>
    /// Index into <see cref="RowFields"/> to order the rows by that dimension first (in
    /// <see cref="SortDescending"/> direction); ignored when <see cref="SortMeasureIndex"/> is set.
    /// </summary>
    public int? SortRowFieldIndex { get; set; }

    /// <summary>Orders the chosen sort highest-first (or Z–A) when true.</summary>
    public bool SortDescending { get; set; }

    /// <summary>Appends a totals row, and a totals column group when there are column fields.</summary>
    public bool ShowGrandTotal { get; set; } = true;

    /// <summary>With two or more row fields, adds a subtotal row heading each outer group.</summary>
    public bool ShowSubtotals { get; set; }
}
