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

    /// <summary>Bucketed into <see cref="PeriodDays"/>-wide windows.</summary>
    public bool ShowSparkline { get; set; }
    public int SparklinePeriods { get; set; } = 8;

    /// <summary>When set, reduces once per distinct value of this column.</summary>
    public Guid? GroupByColumnId { get; set; }
    public int MaxGroups { get; set; } = 8;
}
