namespace Reporting.Abstractions;

/// <summary>
/// One dataset's contribution to a chart: its dataset, axes, optional per-value
/// split, and row filter. A chart carries one or more of these; several overlaid
/// on shared axes is how two datasets are plotted against each other. Each binding
/// is queried on its own dataset and its series merged on the client.
/// </summary>
public class ChartSeriesBinding
{
    /// <summary>Client-generated, addresses this binding in the editor — not meaningful server-side.</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>Null until the user binds this series to a dataset.</summary>
    public int? DatasetId { get; set; }

    public Guid? XColumnId { get; set; }
    public Guid? YColumnId { get; set; }

    /// <summary>
    /// Scales each point's marker by this numeric column's value — a bubble chart. Scatter only;
    /// ignored by every other chart kind (including line, where a varying marker size over a
    /// connected line reads poorly).
    /// </summary>
    public Guid? SizeColumnId { get; set; }

    /// <summary>
    /// A bar chart's measures, each plotted as its own series (grouped or stacked). Empty/null on
    /// point and box charts, which use the single <see cref="YColumnId"/>. When a bar binding has
    /// these, <see cref="YColumnId"/> mirrors the first so older readers still resolve a measure.
    /// </summary>
    public List<Guid>? ValueColumnIds { get; set; }

    /// <summary>Splits this binding into a separate coloured series per distinct value. Null plots one.</summary>
    public Guid? SeriesColumnId { get; set; }

    /// <summary>
    /// On a combination chart, whether this series draws as bars or a line ("bar"/"line"); null/absent
    /// means bars. Ignored by every other chart kind. Client-side render concern; persisted only.
    /// </summary>
    public string? RenderAs { get; set; }

    /// <summary>
    /// Which value axis this binding plots against, by <see cref="ChartValueAxis.Id"/>.
    /// Null — or an id no longer among the chart's axes — falls back to the primary axis.
    /// </summary>
    public string? YAxisId { get; set; }

    /// <summary>Overrides the auto-assigned palette colour; null uses the palette. Client-side render concern; persisted only.</summary>
    public string? Color { get; set; }

    /// <summary>Point marker shape (circle/rect/triangle/diamond/none); null uses the chart kind's default.</summary>
    public string? Symbol { get; set; }

    /// <summary>Line dash (solid/dashed/dotted) for a line series; null draws solid.</summary>
    public string? DashStyle { get; set; }

    /// <summary>Blank falls back to the dataset/column name in the legend.</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>Rows this binding plots, narrowed server-side. Null means no per-series filter.</summary>
    public FilterGroupDto? Filter { get; set; }

    /// <summary>
    /// Draw order for a point chart's (scatter/line) own rows — each binding's points are queried
    /// and ordered independently, since overlaid bindings don't share a merged axis the way bar's
    /// categories do. Null keeps the default X-ascending order. Ignored by every grouping chart
    /// (bar, combo, box plot, histogram), which order via their own chart-level <c>Sort</c> instead.
    /// </summary>
    public ChartSort? Sort { get; set; }
}
