using Reporting.Abstractions;

namespace Reporting.DAL.Repositories;

/// <summary>What a scanned config's references are read against: its widget type and top-level aggregate.</summary>
internal readonly record struct ScanContext(WidgetType? WidgetType, string? Aggregate);
