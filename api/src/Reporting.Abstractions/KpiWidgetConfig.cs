namespace Reporting.Abstractions;

/// <summary>
/// One named aggregate a KPI's formula can reference: a measure over a column (or a row count),
/// narrowed by its own optional filter in addition to the widget's base filter — e.g. an alias
/// "OverLimit" counting rows where a column exceeds a value. <see cref="ColumnId"/> is unused
/// (and may be null) for <see cref="Aggregate.Count"/>, which counts rows.
/// </summary>
public class KpiMeasureConfig
{
    /// <summary>Client-generated, addresses this measure in the editor — not meaningful server-side.</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>The name the formula references this measure by, e.g. <c>[OverLimit]</c>.</summary>
    public string Alias { get; set; } = string.Empty;

    public Guid? ColumnId { get; set; }

    public Aggregate Aggregate { get; set; } = Aggregate.Count;

    /// <summary>Narrows the rows this one measure reduces, ANDed with the widget's base filter.</summary>
    public FilterGroupDto? Filter { get; set; }
}

/// <summary>Literal numeric bounds a KPI's value is judged against, for tile coloring.</summary>
public class KpiThresholdConfig
{
    public double? LowerBound { get; set; }
    public double? UpperBound { get; set; }

    /// <summary>When true, a value outside the bounds is "good" instead of inside them.</summary>
    public bool InvertColors { get; set; }
}

/// <summary>
/// A single headline number: one or more named <see cref="Measures"/> aggregated over a filtered
/// dataset and combined by <see cref="Formula"/>, optionally compared against a second filter and
/// colored against a threshold — the report builder's "big number" tile.
/// </summary>
public class KpiWidgetConfig : WidgetConfig
{
    /// <summary>Null until the user binds the widget to a dataset.</summary>
    public int? DatasetId { get; set; }

    /// <summary>Rows this widget aggregates, narrowed server-side. Null means no widget-level filter.</summary>
    public FilterGroupDto? Filter { get; set; }

    /// <summary>The named aggregates the formula can combine.</summary>
    public List<KpiMeasureConfig> Measures { get; set; } = new();

    /// <summary>
    /// An expression over the measures' aliases, e.g. <c>[OverLimit] / [Total] * 100</c>. Blank
    /// defaults to the sole measure's value when there's exactly one.
    /// </summary>
    public string Formula { get; set; } = string.Empty;

    /// <summary>
    /// When set, the same measures and formula are computed a second time with this filter in place
    /// of <see cref="Filter"/>, giving a comparison value the widget shows as a trend/delta.
    /// </summary>
    public FilterGroupDto? ComparisonFilter { get; set; }

    /// <summary>Whether a higher, lower, or neither comparison value colors the trend as an improvement.</summary>
    public KpiComparisonDirection ComparisonDirection { get; set; } = KpiComparisonDirection.Neutral;

    public KpiThresholdConfig? Threshold { get; set; }

    public NumericColumnConfig? NumberFormat { get; set; }
}

public enum KpiComparisonDirection
{
    Neutral,
    HigherIsBetter,
    LowerIsBetter
}
