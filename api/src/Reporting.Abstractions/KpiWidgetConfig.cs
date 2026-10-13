namespace Reporting.Abstractions;

public enum KpiValueSource
{
    Aggregate,
    ToleranceOutOfLimits
}

public enum KpiComparisonMode
{
    None,
    FixedTarget,
    PreviousPeriod
}

public enum KpiDirection
{
    HigherIsBetter,
    LowerIsBetter
}

/// <summary>Whether "out of limits" tallies only <see cref="ToleranceStatus.Fail"/>, or Fail and Concession together.</summary>
public enum KpiToleranceStatusMode
{
    Fail,
    FailOrConcession
}

/// <summary>
/// A single headline number reduced from a dataset: either a plain aggregate over a column
/// (<see cref="KpiValueSource.Aggregate"/>), or the count/percent of rows failing a tolerance band
/// (<see cref="KpiValueSource.ToleranceOutOfLimits"/>, reusing <see cref="ToleranceConfig"/>).
/// Optionally compared against a fixed target or the previous rolling period, with a
/// <see cref="Direction"/> so the client knows whether the trend is good or bad news.
/// </summary>
public class KpiWidgetConfig : WidgetConfig
{
    /// <summary>Null until the user binds the widget to a dataset.</summary>
    public int? DatasetId { get; set; }

    public KpiValueSource ValueSource { get; set; } = KpiValueSource.Aggregate;

    public Aggregate Aggregate { get; set; } = Aggregate.Sum;

    /// <summary>The aggregated column (Aggregate mode, unused for Count), or the tolerance-checked column (ToleranceOutOfLimits mode).</summary>
    public Guid? ValueColumnId { get; set; }

    /// <summary>ToleranceOutOfLimits mode: the band rows are checked against.</summary>
    public ToleranceConfig? Tolerance { get; set; }

    public KpiToleranceStatusMode ToleranceStatusMode { get; set; } = KpiToleranceStatusMode.Fail;

    /// <summary>ToleranceOutOfLimits mode: shows the failing share as a percent of matched rows rather than a raw count.</summary>
    public bool ShowAsPercent { get; set; } = true;

    public KpiComparisonMode ComparisonMode { get; set; } = KpiComparisonMode.None;

    /// <summary>FixedTarget mode: the value the current figure is compared against.</summary>
    public double? TargetValue { get; set; }

    /// <summary>PreviousPeriod mode: the date column rows are windowed on.</summary>
    public Guid? DateColumnId { get; set; }

    /// <summary>PreviousPeriod mode: the rolling window length in days — "last N days" vs the N days before that.</summary>
    public int PeriodDays { get; set; } = 7;

    /// <summary>Whether a rising value is good or bad news — drives the trend's color, not the arithmetic.</summary>
    public KpiDirection Direction { get; set; } = KpiDirection.HigherIsBetter;

    public string Unit { get; set; } = string.Empty;
    public int DecimalPlaces { get; set; } = 1;

    /// <summary>Rows this widget summarises, narrowed server-side. Null means no widget-level filter.</summary>
    public FilterGroupDto? Filter { get; set; }
}
