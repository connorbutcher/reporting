using Reporting.Abstractions;

namespace Reporting.DAL.Repositories;

internal sealed record ScanWidget(Guid RefId, WidgetType Type, string ConfigJson, string TabName);
