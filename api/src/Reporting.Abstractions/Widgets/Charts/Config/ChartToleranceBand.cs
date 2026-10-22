namespace Reporting.Abstractions;

/// <summary>
/// Reference lines drawn on one axis, resolved against one row of a separate
/// limits dataset — the chart equivalent of a table column's <see cref="ToleranceConfig"/>.
/// A chart can carry several, e.g. one per spec being plotted.
/// </summary>
public class ChartToleranceBand
{
    /// <summary>Client-generated, only for addressing this band in the editor — not meaningful server-side.</summary>
    public string Id { get; set; } = string.Empty;

    public ChartAxis Axis { get; set; } = ChartAxis.Y;

    /// <summary>
    /// Which value axis a <see cref="ChartAxis.Y"/> band draws against, by <see cref="ChartValueAxis.Id"/>;
    /// null falls back to the primary. Ignored for an X band. Client-side render concern; persisted only.
    /// </summary>
    public string? YAxisId { get; set; }

    public int SourceDatasetId { get; set; }
    public Guid SourceRowId { get; set; }
    public Guid MinColumnId { get; set; }
    public Guid MaxColumnId { get; set; }
    public Guid? ConcessionLowerColumnId { get; set; }
    public Guid? ConcessionUpperColumnId { get; set; }

    /// <summary>Shades the in-spec zone (and any concession shoulders) between the band's lines.</summary>
    public bool Fill { get; set; }

    /// <summary>Outlines plotted points that fall outside this band's outermost line.</summary>
    public bool OutlinePoints { get; set; }
}
