namespace Reporting.Abstractions;

/// <summary>What a chart's own order falls back to when nothing overrides it: a bar/combo/box
/// plot's category order, or a point chart's X order.</summary>
public enum ChartSortBy
{
    Default,
    Column
}
