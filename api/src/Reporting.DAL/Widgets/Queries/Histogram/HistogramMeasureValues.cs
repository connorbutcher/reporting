using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>One measure's scanned (series, value) pairs.</summary>
internal sealed record HistogramMeasureValues(DatasetColumn Column, List<(string Series, double Value)> Projected);
