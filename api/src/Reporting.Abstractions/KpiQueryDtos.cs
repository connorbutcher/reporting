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
    public string UnitPrefix { get; set; } = string.Empty;
    public string UnitSuffix { get; set; } = string.Empty;
    public int DecimalPlaces { get; set; } = 1;

    public bool ThresholdsEnabled { get; set; }
    public double? WarningThreshold { get; set; }
    public double? CriticalThreshold { get; set; }

    /// <summary>A trailing-history series for a sparkline, bucketed into <see cref="PeriodDays"/>-wide windows.</summary>
    public bool ShowSparkline { get; set; }
    public int SparklinePeriods { get; set; } = 8;

    /// <summary>Null (the default) reduces the dataset to one value; set, it reduces once per distinct value of this column.</summary>
    public Guid? GroupByColumnId { get; set; }
    public int MaxGroups { get; set; } = 8;
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

/// <summary>Where the absolute value sits against <see cref="KpiQueryDto.WarningThreshold"/>/<see cref="KpiQueryDto.CriticalThreshold"/> — independent of the trend/comparison.</summary>
public enum KpiStatus
{
    /// <summary>Thresholds are off, or there's no value yet.</summary>
    None,
    Good,
    Warning,
    Critical
}

/// <summary>One point of a sparkline's trailing history.</summary>
public class KpiHistoryPointDto
{
    public DateTime PeriodStart { get; set; }

    /// <summary>Null when the bucket had nothing to reduce.</summary>
    public double? Value { get; set; }
}

/// <summary>One tile of a grouped KPI — the reduced value for one distinct value of the group-by column.</summary>
public class KpiGroupResultDto
{
    public string Label { get; set; } = string.Empty;
    public double? Value { get; set; }
    public string? DisplayValue { get; set; }
    public KpiStatus Status { get; set; } = KpiStatus.None;
}

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
