namespace Reporting.Database;

/// <summary>
/// One engine-build dataset shown through every widget and option across ten tabs, with a report-level
/// filter, formula columns, a filtered dataset built on the first, and comments to read in the viewer.
/// Seeded as published version 1, so the viewer-only features (comments, the filter panel, version history)
/// work straight away; "Check out to edit" opens it in the builder.
/// </summary>
internal static class FeatureTourShowcase
{
    /// <summary>
    /// Renamed from "Engine Build — Feature Tour" when the tour was rebuilt, so installs that already have the
    /// old tour (which seeding never overwrites) get this one alongside it.
    /// </summary>
    public const string Name = "Feature Tour — Engine Builds";

    public static Report Build(SeedBatch batch, int number)
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
            Notes = "<p>Seeded feature tour.</p>",
        };

        var log = EngineBuildLogDataset.Build(batch);
        revision.Datasets.Add(log);
        var spec = SpecDatasets.Build(batch, "Bearing Clearance Spec", "{\"source\":\"assembly\",\"typeId\":7788,\"phaseIds\":[9]}",
            "Main Bearing Clearance", 0.030, 0.060, SeedFormats.Mm(4));
        revision.Datasets.Add(spec.Dataset);
        var highRework = SeedDatasets.Create("High-Rework Builds", DatasetSourceIds.Filtered, "{}");
        revision.Datasets.Add(highRework);

        var context = new FeatureTourContext(report, log, spec, highRework);
        AddFilters(revision, batch, context);
        AddTabs(revision, batch, context);

        report.Revisions.Add(revision);
        return report;
    }

    private static void AddTabs(ReportRevision revision, SeedBatch batch, FeatureTourContext context)
    {
        FeatureTourBuildLogTab.Add(revision, batch, context);
        FeatureTourPivotTab.Add(revision, batch, context);
        FeatureTourTrendsTab.Add(revision, batch, context);
        FeatureTourCostTab.Add(revision, batch, context);
        FeatureTourQualityTab.Add(revision, batch, context);
        FeatureTourControlTab.Add(revision, batch, context);
        FeatureTourKpiTab.Add(revision, batch, context);
        FeatureTourFormulaTab.Add(revision, batch, context);
        FeatureTourFilteredTab.Add(revision, batch, context);
        FeatureTourExploreTab.Add(revision);
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
