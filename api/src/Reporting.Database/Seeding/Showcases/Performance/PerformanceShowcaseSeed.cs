namespace Reporting.Database;

/// <summary>The report to save, and the generated datasets whose rows are written after it.</summary>
internal sealed record PerformanceShowcaseSeed(Report Report, IReadOnlyList<ISeedRowSource> Sources);
