namespace Reporting.Abstractions;

public class PivotTableWidgetConfig : WidgetConfig
{
    public int? DatasetId { get; set; }

    /// <summary>Nested left to right.</summary>
    public List<Guid> RowFields { get; set; } = new();

    /// <summary>One group of value columns per combination.</summary>
    public List<Guid> ColumnFields { get; set; } = new();

    public List<PivotFieldGroupingDto> FieldGroupings { get; set; } = new();

    public List<PivotMeasureConfig> Measures { get; set; } = new();

    /// <summary>Null orders by the dimensions.</summary>
    public string? SortMeasureId { get; set; }

    public bool SortDescending { get; set; }

    /// <summary>Also adds a totals column group with column fields.</summary>
    public bool ShowGrandTotal { get; set; } = true;

    /// <summary>Needs two or more row fields.</summary>
    public bool ShowSubtotals { get; set; }

    public FilterGroupDto? Filter { get; set; }
}
