namespace Reporting.Abstractions;

public class PivotQueryDto
{
    public FilterGroupDto? Filter { get; set; }

    /// <summary>The columns rows are grouped by, in order — each becomes a dimension column, nested left to right.</summary>
    public List<Guid> RowFields { get; set; } = new();

    /// <summary>The value columns computed for each group — one output column per measure, in order.</summary>
    public List<PivotMeasureDto> Measures { get; set; } = new();

    /// <summary>
    /// Index into <see cref="Measures"/> to order the rows by that measure's value; null orders by
    /// the dimension keys. Applied before the row cap, so it yields a genuine top-N.
    /// </summary>
    public int? SortMeasureIndex { get; set; }

    /// <summary>Orders a measure sort highest-first when true; ignored without <see cref="SortMeasureIndex"/>.</summary>
    public bool SortDescending { get; set; }

    /// <summary>Appends a totals row aggregating every matched row across the whole pivot.</summary>
    public bool ShowGrandTotal { get; set; } = true;
}

/// <summary>One measure a pivot computes: an aggregate over a column, reduced within each group.</summary>
public class PivotMeasureDto
{
    /// <summary>The column reduced; null (and ignored) for <see cref="Aggregate.Count"/>, which counts rows.</summary>
    public Guid? ColumnId { get; set; }

    public Aggregate Aggregate { get; set; } = Aggregate.Sum;

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
    /// <summary>Stable per-result key ("m0", "m1", …), matching the order of <see cref="PivotRowDto.Values"/>.</summary>
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public Guid? ColumnId { get; set; }
    public Aggregate Aggregate { get; set; }
}

/// <summary>One measure's value in a row, both raw (for the client) and already formatted for display.</summary>
public class PivotCellDto
{
    /// <summary>The aggregated number, or null where the group had nothing to reduce.</summary>
    public double? Value { get; set; }

    /// <summary>Formatted per the measure column's display configuration; null for a blank cell.</summary>
    public string? DisplayValue { get; set; }
}

public class PivotRowDto
{
    /// <summary>The formatted dimension values, one per row field in order; empty for a total-only pivot.</summary>
    public List<string> Dimensions { get; set; } = new();

    /// <summary>One entry per measure in request order.</summary>
    public List<PivotCellDto> Values { get; set; } = new();

    /// <summary>True for the grand-total row, so the client can style it apart.</summary>
    public bool IsGrandTotal { get; set; }
}

public class PivotQueryResultDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>The dimension columns, left to right — the grouped columns' headers.</summary>
    public List<PivotFieldDto> RowFields { get; set; } = new();

    /// <summary>The measure columns, in order — the value columns' headers.</summary>
    public List<PivotMeasureColumnDto> Measures { get; set; } = new();

    public List<PivotRowDto> Rows { get; set; } = new();

    /// <summary>The totals row, when requested; null otherwise.</summary>
    public PivotRowDto? GrandTotal { get; set; }

    /// <summary>Rows in the dataset before filtering, so the widget can show "142 of 1,203".</summary>
    public int TotalRowCount { get; set; }
    public int MatchedRowCount { get; set; }

    /// <summary>True when the scan or the group count hit its cap, so more underlying data exists than was reduced.</summary>
    public bool Truncated { get; set; }
}
