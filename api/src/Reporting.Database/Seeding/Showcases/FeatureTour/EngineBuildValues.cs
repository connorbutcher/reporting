namespace Reporting.Database;

/// <summary>The stored inputs the build log's formula columns read.</summary>
internal sealed record EngineBuildValues(string Engine, double Cost, double Hours, DateTime Date, int Rework, bool Passed);
