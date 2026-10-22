namespace Reporting.Database;

/// <summary>A widget whose config is written once its datasets have database ids.</summary>
internal sealed record PendingChart(Widget Widget, Func<string> BuildJson);
