using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>A tooltip column reduced per (category, series), like the bars.</summary>
internal sealed record BarTooltipStats(
    ChartTooltipColumn Setting, DatasetColumn Column, Dictionary<(string Category, string Series), BarStats> Stats);
