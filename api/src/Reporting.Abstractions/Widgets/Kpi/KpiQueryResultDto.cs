namespace Reporting.Abstractions;

public class KpiQueryResultDto
{
    /// <summary>The reduced figure. Null when there was nothing to reduce (no value column chosen yet, or no matched rows).</summary>
    public double? Value { get; set; }

    /// <summary>Formatted per <see cref="KpiQueryDto.DecimalPlaces"/>/<see cref="KpiQueryDto.UnitPrefix"/>/<see cref="KpiQueryDto.UnitSuffix"/>; null for a blank value.</summary>
    public string? DisplayValue { get; set; }

    /// <summary>The target or previous-period figure <see cref="Value"/> is measured against; null without a comparison.</summary>
    public double? ComparisonValue { get; set; }

    public string? ComparisonDisplayValue { get; set; }

    /// <summary><see cref="Value"/> minus <see cref="ComparisonValue"/>; null without a comparison.</summary>
    public double? Delta { get; set; }

    /// <summary><see cref="Delta"/> as a percent of the comparison value's magnitude; null without a comparison, or when it's zero.</summary>
    public double? DeltaPercent { get; set; }

    public KpiTrend Trend { get; set; } = KpiTrend.Unknown;
    public KpiTrendSentiment Sentiment { get; set; } = KpiTrendSentiment.Neutral;

    /// <summary>Where <see cref="Value"/> sits against the configured thresholds; <see cref="KpiStatus.None"/> when they're off.</summary>
    public KpiStatus Status { get; set; } = KpiStatus.None;

    /// <summary>The sparkline's trailing history, oldest first; empty unless <see cref="KpiQueryDto.ShowSparkline"/>.</summary>
    public List<KpiHistoryPointDto> History { get; set; } = new();

    /// <summary>Set instead of <see cref="Value"/>/<see cref="Trend"/>/etc. when <see cref="KpiQueryDto.GroupByColumnId"/> is set — one tile per distinct group value.</summary>
    public List<KpiGroupResultDto>? Groups { get; set; }

    /// <summary>Rows that fed the displayed <see cref="Value"/> — the whole filtered set, or just the current window in PreviousPeriod mode.</summary>
    public int MatchedRowCount { get; set; }

    public int TotalRowCount { get; set; }

    /// <summary>True when a scan cap (or <see cref="KpiQueryDto.MaxGroups"/>) was hit, so more underlying data exists than was reduced.</summary>
    public bool Truncated { get; set; }
}
