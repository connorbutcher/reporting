namespace Reporting.Database;

/// <summary>How many rows each Performance at Scale dataset gets; tests seed a few hundred instead.</summary>
public sealed record PerformanceShowcaseSizes(int SensorReadings, int DynoRuns)
{
    public static readonly PerformanceShowcaseSizes Full = new(1_000_000, 100_000);
}
