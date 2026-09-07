namespace Reporting.Abstractions;

/// <summary>
/// One measure a pivot table computes and shows as a value column: an aggregate over a column,
/// reduced within each group. <see cref="ColumnId"/> is unused (and may be null) for
/// <see cref="Aggregate.Count"/>, which counts rows.
/// </summary>
public class PivotMeasureConfig
{
    /// <summary>Client-generated, addresses this measure in the editor — not meaningful server-side.</summary>
    public string Id { get; set; } = string.Empty;

    public Guid? ColumnId { get; set; }

    public Aggregate Aggregate { get; set; } = Aggregate.Sum;

    /// <summary>Overrides the derived column header (e.g. "Sum of Cost"); blank uses the derived one.</summary>
    public string Label { get; set; } = string.Empty;
}

/// <summary>
/// A pivot / aggregation table: rows are grouped by one or more dimension columns
/// (<see cref="RowFields"/>) and each group reduced to one or more measures
/// (<see cref="Measures"/>) — the tabular counterpart of the bar chart's aggregate.
/// </summary>
public class PivotTableWidgetConfig : WidgetConfig
{
    /// <summary>Null until the user binds the pivot to a dataset.</summary>
    public int? DatasetId { get; set; }

    /// <summary>The columns rows are grouped by, in order — nested left to right.</summary>
    public List<Guid> RowFields { get; set; } = new();

    /// <summary>The measures computed for each group, each shown as its own value column.</summary>
    public List<PivotMeasureConfig> Measures { get; set; } = new();

    /// <summary>Appends a totals row aggregating every matched row.</summary>
    public bool ShowGrandTotal { get; set; } = true;

    /// <summary>Rows this widget aggregates, narrowed server-side. Null means no widget-level filter.</summary>
    public FilterGroupDto? Filter { get; set; }
}
