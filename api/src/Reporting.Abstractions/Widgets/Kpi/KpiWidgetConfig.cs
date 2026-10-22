namespace Reporting.Abstractions;

/// <summary>A headline number: an aggregate, or the rows failing a tolerance band, optionally compared to a target or the previous period.</summary>
public class KpiWidgetConfig : WidgetConfig
{
    public int? DatasetId { get; set; }

    public KpiValueSource ValueSource { get; set; } = KpiValueSource.Aggregate;

    public Aggregate Aggregate { get; set; } = Aggregate.Sum;

    /// <summary>The aggregated column, or the tolerance-checked one.</summary>
    public Guid? ValueColumnId { get; set; }

    /// <summary>ToleranceOutOfLimits mode only.</summary>
    public ToleranceConfig? Tolerance { get; set; }

    public KpiToleranceStatusMode ToleranceStatusMode { get; set; } = KpiToleranceStatusMode.Fail;

    /// <summary>ToleranceOutOfLimits mode only.</summary>
    public bool ShowAsPercent { get; set; } = true;

    public KpiComparisonMode ComparisonMode { get; set; } = KpiComparisonMode.None;

    /// <summary>FixedTarget mode only.</summary>
    public double? TargetValue { get; set; }

    /// <summary>PreviousPeriod mode only.</summary>
    public Guid? DateColumnId { get; set; }

    /// <summary>PreviousPeriod mode: "last N days" against the N days before.</summary>
    public int PeriodDays { get; set; } = 7;

    /// <summary>Drives the trend's colour, not the arithmetic.</summary>
    public KpiDirection Direction { get; set; } = KpiDirection.HigherIsBetter;

    public string UnitPrefix { get; set; } = string.Empty;
    public string UnitSuffix { get; set; } = string.Empty;
    public int DecimalPlaces { get; set; } = 1;

    /// <summary>Absolute status bands, independent of the trend.</summary>
    public bool ThresholdsEnabled { get; set; }

    /// <summary>Lower bounds when higher is better, upper bounds otherwise.</summary>
    public double? WarningThreshold { get; set; }
    public double? CriticalThreshold { get; set; }

    /// <summary>Bucketed into <see cref="PeriodDays"/>-wide windows.</summary>
    public bool ShowSparkline { get; set; }
    public int SparklinePeriods { get; set; } = 8;

    /// <summary>FixedTarget mode: a progress bar instead of the trend arrow.</summary>
    public bool ShowAsMeter { get; set; }

    /// <summary>When set, shows one tile per distinct value, capped at <see cref="MaxGroups"/>.</summary>
    public Guid? GroupByColumnId { get; set; }
    public int MaxGroups { get; set; } = 8;

    public FilterGroupDto? Filter { get; set; }
}
