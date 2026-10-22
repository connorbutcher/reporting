using Reporting.Abstractions;

namespace Reporting.DAL.Widgets;

internal sealed record AggregatedPoint(string Series, ChartPointDto Point);
