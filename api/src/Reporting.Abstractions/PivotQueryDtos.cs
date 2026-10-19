namespace Reporting.Abstractions;

/// <summary>
/// How a pivot measure reduces a group. The first five match <see cref="Aggregate"/> name for name,
/// so measures saved before the pivot had its own list still read.
/// </summary>
public enum PivotAggregate
{
    Sum,
    Average,
    Count,
    Min,
    Max,
    /// <summary>How many different values the column holds in the group; works on any column type.</summary>
    CountDistinct,
    Median
}

/// <summary>How a pivot measure's value is shown: as itself, or as a share of a larger total.</summary>
public enum PivotShowAs
{
    Value,
    /// <summary>A share of the same measure's total for its column (the grand total without column fields).</summary>
    PercentOfTotal,
    /// <summary>A share of the same measure for the enclosing group (the total for top-level groups).</summary>
    PercentOfParent
}

/// <summary>The period a date field is grouped into, rather than one group per distinct value.</summary>
public enum DateGrouping
{
    Day,
    Week,
    Month,
    Quarter,
    Year
}

/// <summary>Groups a date row or column field by period.</summary>
public class PivotFieldGroupingDto
{
    public Guid ColumnId { get; set; }
    public DateGrouping Grouping { get; set; } = DateGrouping.Month;
}

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

/// <summary>One measure a pivot computes: an aggregate over a column, reduced within each group.</summary>
public class PivotMeasureDto
{
    /// <summary>The column reduced; null (and ignored) for <see cref="PivotAggregate.Count"/>, which counts rows.</summary>
    public Guid? ColumnId { get; set; }

    public PivotAggregate Aggregate { get; set; } = PivotAggregate.Sum;

    public PivotShowAs ShowAs { get; set; } = PivotShowAs.Value;

    /// <summary>Overrides the derived column header (e.g. "Sum of Cost"); blank uses the derived one.</summary>
    public string Label { get; set; } = string.Empty;
}

/// <summary>A dimension column in the result header, so the client can label the grouped columns.</summary>
public class PivotFieldDto
{
    public Guid ColumnId { get; set; }
    public string Label { get; set; } = string.Empty;
}

/// <summary>A measure column in the result header — its resolved label and which measure it came from.</summary>
public class PivotMeasureColumnDto
{
    /// <summary>Stable per-result key ("m0", "m1", …) naming the measure's position in the request.</summary>
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public Guid? ColumnId { get; set; }
    public PivotAggregate Aggregate { get; set; }
    public PivotShowAs ShowAs { get; set; }
}

/// <summary>One combination of column-field values: a group of value columns across the top.</summary>
public class PivotColumnKeyDto
{
    /// <summary>The formatted value of each column field, in order.</summary>
    public List<string> Labels { get; set; } = new();

    /// <summary>Conditions selecting the rows behind this column, for drill-through; null when they can't be expressed.</summary>
    public FilterGroupDto? Drill { get; set; }
}

/// <summary>One measure's value in a row, both raw (for the client) and already formatted for display.</summary>
public class PivotCellDto
{
    /// <summary>The aggregated number (a fraction for a percentage), or null where the group had nothing to reduce.</summary>
    public double? Value { get; set; }

    /// <summary>Formatted per the measure column's display configuration; null for a blank cell.</summary>
    public string? DisplayValue { get; set; }
}

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

public class PivotQueryResultDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>The dimension columns, left to right — the grouped columns' headers.</summary>
    public List<PivotFieldDto> RowFields { get; set; } = new();

    /// <summary>The fields spread across the top, in order.</summary>
    public List<PivotFieldDto> ColumnFields { get; set; } = new();

    /// <summary>The measure columns, in order — the value columns' headers.</summary>
    public List<PivotMeasureColumnDto> Measures { get; set; } = new();

    /// <summary>The column-field combinations across the top, in order; empty without column fields.</summary>
    public List<PivotColumnKeyDto> ColumnKeys { get; set; } = new();

    /// <summary>True when each row ends with a block of row totals after its column groups.</summary>
    public bool HasRowTotals { get; set; }

    public List<PivotRowDto> Rows { get; set; } = new();

    /// <summary>The totals row, when requested; null otherwise.</summary>
    public PivotRowDto? GrandTotal { get; set; }

    /// <summary>Rows in the dataset before filtering, so the widget can show "142 of 1,203".</summary>
    public int TotalRowCount { get; set; }
    public int MatchedRowCount { get; set; }

    /// <summary>
    /// True when only the first <see cref="ScannedRowCount"/> matched rows were summarised, so every
    /// value — totals included — is incomplete.
    /// </summary>
    public bool ScanTruncated { get; set; }

    /// <summary>How many matched rows were summarised.</summary>
    public int ScannedRowCount { get; set; }

    /// <summary>True when there were more groups than the row cap, so some groups aren't listed (the totals still count them).</summary>
    public bool RowsTruncated { get; set; }

    /// <summary>True when there were more column-field combinations than the column cap, so some aren't shown.</summary>
    public bool ColumnsTruncated { get; set; }

    /// <summary>True when any cap was hit.</summary>
    public bool Truncated { get; set; }
}
