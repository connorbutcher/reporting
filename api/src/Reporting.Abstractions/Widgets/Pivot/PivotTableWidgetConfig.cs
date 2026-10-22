namespace Reporting.Abstractions;

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

    /// <summary>The columns spread across the top, in order — one group of value columns per combination.</summary>
    public List<Guid> ColumnFields { get; set; } = new();

    /// <summary>Date fields (row or column) grouped by period rather than by exact value.</summary>
    public List<PivotFieldGroupingDto> FieldGroupings { get; set; } = new();

    /// <summary>The measures computed for each group, each shown as its own value column.</summary>
    public List<PivotMeasureConfig> Measures { get; set; } = new();

    /// <summary>The measure (by its <see cref="PivotMeasureConfig.Id"/>) the rows are ordered by; null orders by the dimensions.</summary>
    public string? SortMeasureId { get; set; }

    /// <summary>Orders the measure sort highest-first when true.</summary>
    public bool SortDescending { get; set; }

    /// <summary>Appends a totals row aggregating every matched row (and a totals column group with column fields).</summary>
    public bool ShowGrandTotal { get; set; } = true;

    /// <summary>With two or more row fields, adds a subtotal row heading each outer group, which readers can collapse.</summary>
    public bool ShowSubtotals { get; set; }

    /// <summary>Rows this widget aggregates, narrowed server-side. Null means no widget-level filter.</summary>
    public FilterGroupDto? Filter { get; set; }
}
