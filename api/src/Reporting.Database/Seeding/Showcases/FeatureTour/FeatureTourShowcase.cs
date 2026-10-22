using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>
/// One engine-build dataset shown through every widget and option across six tabs, with a report-level
/// filter and a filtered dataset built on the first.
/// </summary>
internal static class FeatureTourShowcase
{
    public const string Name = "Engine Build — Feature Tour";

    public static Report Build(SeedBatch batch, int number)
    {
        var now = DateTime.UtcNow;
        var report = new Report { RefId = Guid.NewGuid(), Number = number, Name = Name, CreatedAt = now, UpdatedAt = now };
        var revision = new ReportRevision { RefId = Guid.NewGuid(), Kind = RevisionKind.Draft, CreatedAt = now };

        var log = EngineBuildLogDataset.Build(batch);
        revision.Datasets.Add(log);
        var spec = SpecDatasets.Build(batch, "Bearing Clearance Spec", "{\"source\":\"assembly\",\"typeId\":7788,\"phaseIds\":[9]}",
            "Main Bearing Clearance", 0.030, 0.060, SeedFormats.Mm(4));
        revision.Datasets.Add(spec.Dataset);
        var highRework = SeedDatasets.Create("High-Rework Builds", DatasetSourceIds.Filtered, "{}");
        revision.Datasets.Add(highRework);

        var context = new FeatureTourContext(log, spec, highRework);
        AddFilters(revision, batch, context);

        FeatureTourBuildLogTab.Add(revision, batch, context);
        FeatureTourTrendsTab.Add(revision, batch, context);
        FeatureTourCostTab.Add(revision, batch, context);
        FeatureTourQualityTab.Add(revision, batch, context);
        FeatureTourKpiTab.Add(revision, batch, context);
        FeatureTourFilteredTab.Add(revision, batch, context);

        report.Revisions.Add(revision);
        return report;
    }

    /// <summary>Both reference the build log's id, so they're written after the first save.</summary>
    private static void AddFilters(ReportRevision revision, SeedBatch batch, FeatureTourContext context)
    {
        var lineRef = context.Ref("Assembly Line");
        var reworkRef = context.Ref("Rework Count");

        batch.AddFinalizer(() => revision.FiltersJson =
            FilterJson.ReportFilters((context.Log.Id, FilterJson.Group("and", FilterJson.Condition(lineRef, "notEquals", "R&D Bench")))));

        batch.AddFinalizer(() => context.HighRework.SourceConfigJson =
            FilterJson.FilteredSourceConfig(context.Log.Id, FilterJson.Group("and", FilterJson.Condition(reworkRef, "greaterThan", "0"))));
    }
}
