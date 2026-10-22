namespace Reporting.Abstractions;

public class PivotQueryDto
{
    public FilterGroupDto? Filter { get; set; }

    /// <summary>Nested left to right.</summary>
    public List<Guid> RowFields { get; set; } = new();

    /// <summary>Each combination of values becomes a group of value columns, one per measure.</summary>
    public List<Guid> ColumnFields { get; set; } = new();

    public List<PivotFieldGroupingDto> FieldGroupings { get; set; } = new();

    public List<PivotMeasureDto> Measures { get; set; } = new();

    /// <summary>Orders rows by this measure before the row cap, giving a genuine top-N; null orders by dimensions.</summary>
    public int? SortMeasureIndex { get; set; }

    /// <summary>Orders rows by this dimension first; ignored when <see cref="SortMeasureIndex"/> is set.</summary>
    public int? SortRowFieldIndex { get; set; }

    public bool SortDescending { get; set; }

    /// <summary>Also adds a totals column group when there are column fields.</summary>
    public bool ShowGrandTotal { get; set; } = true;

    /// <summary>Needs two or more row fields.</summary>
    public bool ShowSubtotals { get; set; }
}
