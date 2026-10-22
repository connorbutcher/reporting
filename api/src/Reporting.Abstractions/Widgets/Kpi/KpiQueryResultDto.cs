namespace Reporting.Abstractions;

public class KpiQueryResultDto
{
    /// <summary>Null when there was nothing to reduce.</summary>
    public double? Value { get; set; }

    public string? DisplayValue { get; set; }

    /// <summary>The target or previous-period figure; null without a comparison.</summary>
    public double? ComparisonValue { get; set; }

    public string? ComparisonDisplayValue { get; set; }

    public double? Delta { get; set; }

    /// <summary>Of the comparison value's magnitude; null when that is zero.</summary>
    public double? DeltaPercent { get; set; }

    public KpiTrend Trend { get; set; } = KpiTrend.Unknown;
    public KpiTrendSentiment Sentiment { get; set; } = KpiTrendSentiment.Neutral;

    public KpiStatus Status { get; set; } = KpiStatus.None;

    /// <summary>Oldest first.</summary>
    public List<KpiHistoryPointDto> History { get; set; } = new();

    /// <summary>Set instead of the single value when grouping.</summary>
    public List<KpiGroupResultDto>? Groups { get; set; }

    /// <summary>Only the current window in PreviousPeriod mode.</summary>
    public int MatchedRowCount { get; set; }

    public int TotalRowCount { get; set; }

    /// <summary>A scan cap or <see cref="KpiQueryDto.MaxGroups"/> was hit.</summary>
    public bool Truncated { get; set; }
}
