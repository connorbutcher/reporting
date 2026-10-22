using System.Globalization;
using Reporting.Abstractions;

namespace Reporting.DAL.Widgets;

/// <summary>Formats a KPI's values and classifies its status and trend.</summary>
internal static class KpiPresentation
{
    public static string? Format(double? value, KpiQueryDto dto)
    {
        if (value is not { } v)
        {
            return null;
        }

        var number = v.ToString("N" + Math.Clamp(dto.DecimalPlaces, 0, 6), CultureInfo.InvariantCulture);
        return $"{dto.UnitPrefix}{number}{dto.UnitSuffix}";
    }

    /// <summary>Against the thresholds, direction-aware and independent of the comparison.</summary>
    public static KpiStatus Status(double? value, KpiQueryDto dto)
    {
        if (!dto.ThresholdsEnabled || value is not { } v)
        {
            return KpiStatus.None;
        }

        if (Breaches(v, dto.CriticalThreshold, dto.Direction))
        {
            return KpiStatus.Critical;
        }
        if (Breaches(v, dto.WarningThreshold, dto.Direction))
        {
            return KpiStatus.Warning;
        }
        return KpiStatus.Good;
    }

    public static void ApplyFormattingAndTrend(KpiQueryResultDto result, KpiQueryDto dto)
    {
        result.DisplayValue = Format(result.Value, dto);
        result.ComparisonDisplayValue = Format(result.ComparisonValue, dto);

        if (result.Value is not { } value || result.ComparisonValue is not { } comparison)
        {
            return;
        }

        var delta = value - comparison;
        result.Delta = delta;
        result.DeltaPercent = comparison != 0 ? 100.0 * delta / Math.Abs(comparison) : null;
        result.Trend = delta switch
        {
            > 0 => KpiTrend.Up,
            < 0 => KpiTrend.Down,
            _ => KpiTrend.Flat,
        };
        result.Sentiment = Sentiment(result.Trend, dto.Direction);
    }

    private static KpiTrendSentiment Sentiment(KpiTrend trend, KpiDirection direction)
    {
        return trend switch
        {
            KpiTrend.Up => direction == KpiDirection.HigherIsBetter ? KpiTrendSentiment.Good : KpiTrendSentiment.Bad,
            KpiTrend.Down => direction == KpiDirection.LowerIsBetter ? KpiTrendSentiment.Good : KpiTrendSentiment.Bad,
            _ => KpiTrendSentiment.Neutral,
        };
    }

    private static bool Breaches(double value, double? threshold, KpiDirection direction)
    {
        return threshold is { } t && (direction == KpiDirection.LowerIsBetter ? value >= t : value <= t);
    }
}
