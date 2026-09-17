namespace Reporting.Abstractions;

public class KpiMeasureDto
{
    /// <summary>The name the formula references this measure by, e.g. <c>[OverLimit]</c>.</summary>
    public string Alias { get; set; } = string.Empty;

    /// <summary>The column reduced; null (and ignored) for <see cref="Aggregate.Count"/>, which counts rows.</summary>
    public Guid? ColumnId { get; set; }

    public Aggregate Aggregate { get; set; } = Aggregate.Count;

    /// <summary>Narrows the rows this one measure reduces, ANDed with the query's active filter.</summary>
    public FilterGroupDto? Filter { get; set; }
}

public class KpiQueryDto
{
    public FilterGroupDto? Filter { get; set; }

    public List<KpiMeasureDto> Measures { get; set; } = new();

    /// <summary>An expression over the measures' aliases; blank defaults to the sole measure's value.</summary>
    public string Formula { get; set; } = string.Empty;

    /// <summary>When set, the value is computed a second time with this filter instead of <see cref="Filter"/>.</summary>
    public FilterGroupDto? ComparisonFilter { get; set; }

    public NumericColumnConfig? NumberFormat { get; set; }

    public KpiThresholdConfig? Threshold { get; set; }
}

/// <summary>Where a KPI value falls against its configured threshold, for the tile's coloring.</summary>
public enum KpiStatus
{
    Neutral,
    Good,
    Bad
}

public class KpiQueryResultDto
{
    /// <summary>The formula's result over <see cref="KpiQueryDto.Filter"/>; null when nothing matched or the formula errored.</summary>
    public double? Value { get; set; }

    public string? FormattedValue { get; set; }

    /// <summary>The same computation over <see cref="KpiQueryDto.ComparisonFilter"/>, when one was supplied.</summary>
    public double? ComparisonValue { get; set; }

    public string? FormattedComparisonValue { get; set; }

    /// <summary><see cref="Value"/> minus <see cref="ComparisonValue"/>; null unless both are present.</summary>
    public double? Delta { get; set; }

    /// <summary><see cref="Delta"/> as a percentage of the comparison value; null if that value is zero or absent.</summary>
    public double? DeltaPercent { get; set; }

    public KpiStatus Status { get; set; } = KpiStatus.Neutral;

    /// <summary>An unknown alias, a formula parse error, or a runtime evaluation error (e.g. divide by zero).</summary>
    public string? Error { get; set; }

    public int TotalRowCount { get; set; }
    public int MatchedRowCount { get; set; }

    /// <summary>True when a measure's scan hit its row cap, so more underlying data exists than was reduced.</summary>
    public bool Truncated { get; set; }
}
