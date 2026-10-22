namespace Reporting.Abstractions;

/// <summary>Reference lines on one axis, resolved against one row of a separate limits dataset.</summary>
public class ChartToleranceBand
{
    /// <summary>Client-generated editor id.</summary>
    public string Id { get; set; } = string.Empty;

    public ChartAxis Axis { get; set; } = ChartAxis.Y;

    /// <summary>Client-only. Null uses the primary value axis.</summary>
    public string? YAxisId { get; set; }

    public int SourceDatasetId { get; set; }
    public Guid SourceRowId { get; set; }
    public Guid MinColumnId { get; set; }
    public Guid MaxColumnId { get; set; }
    public Guid? ConcessionLowerColumnId { get; set; }
    public Guid? ConcessionUpperColumnId { get; set; }

    public bool Fill { get; set; }

    /// <summary>Outlines points outside the band's outermost line.</summary>
    public bool OutlinePoints { get; set; }
}
