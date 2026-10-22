namespace Reporting.Database;

/// <summary>
/// The same widgets as the feature tour over a million sensor readings and 100,000 dyno runs. Published once
/// and meant for the viewer: checking it out or publishing copies every row and cell.
/// </summary>
internal static class PerformanceShowcase
{
    public const string Name = "Performance at Scale";

    public static PerformanceShowcaseSeed Build(SeedBatch batch, int number, PerformanceShowcaseSizes sizes)
    {
        var now = DateTime.UtcNow;
        var report = new Report { RefId = Guid.NewGuid(), Number = number, Name = Name, CreatedAt = now, UpdatedAt = now };
        var revision = new ReportRevision
        {
            RefId = Guid.NewGuid(),
            Kind = RevisionKind.Published,
            VersionNumber = 1,
            CreatedAt = now,
            PublishedAt = now,
            Notes = "<p>Seeded large datasets.</p>",
        };

        var readings = new SensorReadingsDataset(sizes.SensorReadings);
        revision.Datasets.Add(readings.Dataset);
        var tempSpec = SpecDatasets.Build(batch, "Spindle Temp Limits", "{\"source\":\"assembly\",\"typeId\":9122,\"phaseIds\":[1]}",
            "Spindle Temp", 40.0, 80.0, SeedFormats.Unit(1, " °C"));
        revision.Datasets.Add(tempSpec.Dataset);
        var runs = new DynoRunsDataset(sizes.DynoRuns);
        revision.Datasets.Add(runs.Dataset);

        var context = new PerformanceContext(readings.Dataset, tempSpec, runs.Dataset, sizes);
        PerformanceReadingsTab.Add(revision, batch, context);
        PerformanceRunsTab.Add(revision, batch, context);
        PerformanceLimitsTab.Add(revision);

        report.Revisions.Add(revision);
        return new PerformanceShowcaseSeed(report, [readings, runs]);
    }
}
