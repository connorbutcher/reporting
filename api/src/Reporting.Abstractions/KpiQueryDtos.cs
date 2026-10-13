namespace Reporting.Abstractions;

public class KpiQueryDto
{
    public FilterGroupDto? Filter { get; set; }

    public KpiValueSource ValueSource { get; set; } = KpiValueSource.Aggregate;
    public Aggregate Aggregate { get; set; } = Aggregate.Sum;
    public Guid? ValueColumnId { get; set; }

    public ToleranceConfig? Tolerance { get; set; }
    public KpiToleranceStatusMode ToleranceStatusMode { get; set; } = KpiToleranceStatusMode.Fail;
    public bool ShowAsPercent { get; set; } = true;

    public KpiComparisonMode ComparisonMode { get; set; } = KpiComparisonMode.None;
    public double? TargetValue { get; set; }
    public Guid? DateColumnId { get; set; }
    public int PeriodDays { get; set; } = 7;

    public KpiDirection Direction { get; set; } = KpiDirection.HigherIsBetter;
    public string Unit { get; set; } = string.Empty;
    public int DecimalPlaces { get; set; } = 1;
}

/// <summary>Which way the headline number moved since the comparison value.</summary>
public enum KpiTrend
{
    /// <summary>No comparison value to measure against (ComparisonMode is None, or a window had nothing to reduce).</summary>
    Unknown,
    Up,
    Down,
    Flat
}

/// <summary>Whether the trend is good or bad news, after folding in the widget's <see cref="KpiDirection"/>.</summary>
public enum KpiTrendSentiment
{
    Neutral,
    Good,
    Bad
}

public class KpiQueryResultDto
{
    /// <summary>The reduced figure. Null when there was nothing to reduce (no value column chosen yet, or no matched rows).</summary>
    public double? Value { get; set; }

    /// <summary>Formatted per <see cref="KpiQueryDto.DecimalPlaces"/>/<see cref="KpiQueryDto.Unit"/>; null for a blank value.</summary>
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

    /// <summary>Rows that fed the displayed <see cref="Value"/> — the whole filtered set, or just the current window in PreviousPeriod mode.</summary>
    public int MatchedRowCount { get; set; }

    public int TotalRowCount { get; set; }

    /// <summary>True when a scan cap was hit, so more underlying data exists than was reduced.</summary>
    public bool Truncated { get; set; }
}
