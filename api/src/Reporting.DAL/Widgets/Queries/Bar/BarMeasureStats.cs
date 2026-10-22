using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>One measure's stats per (category, series). A null column is Count.</summary>
internal sealed record BarMeasureStats(DatasetColumn? Column, Dictionary<(string Category, string Series), BarStats> Stats);
