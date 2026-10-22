namespace Reporting.Abstractions;

/// <summary>Whether the trend is good or bad news, after folding in the widget's <see cref="KpiDirection"/>.</summary>
public enum KpiTrendSentiment
{
    Neutral,
    Good,
    Bad
}
