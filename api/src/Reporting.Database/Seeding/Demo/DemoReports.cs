namespace Reporting.Database;

/// <summary>The starter report plus a folder tree of reports in every state: draft, published, published with a draft, and empty.</summary>
internal static class DemoReports
{
    private static readonly string[] BuildColumns =
    [
        "Job Number", "Serial Number", "Part Number", "Main Bearing Clearance",
        "Big End Clearance", "Build Concessions Signed Off",
    ];

    private static readonly string[] TestColumns = ["Job Number", "Serial Number", "Peak Power", "Peak Torque", "Passed"];

    public static Report BuildStarterReport(SeedBatch batch)
    {
        var now = DateTime.UtcNow;
        var report = new Report { RefId = Guid.NewGuid(), Number = 1, Name = "Engine Build Report", CreatedAt = now, UpdatedAt = now };
        var revision = new ReportRevision { RefId = Guid.NewGuid(), Kind = RevisionKind.Draft, CreatedAt = now };

        DemoRevisions.AddDataset(revision, batch, "Build Clearances", EngineBuildsDataset.Build, BuildColumns);

        report.Revisions.Add(revision);
        return report;
    }

    public static void AddFoldersAndReports(ReportingDbContext db, SeedBatch batch)
    {
        var now = DateTime.UtcNow;

        var engineBuilds = NewFolder("Engine Builds", null, now);
        var q1 = NewFolder("2026 Q1", engineBuilds, now);
        var chassisQa = NewFolder("Chassis QA", null, now);
        var concessions = NewFolder("Concessions", null, now);
        db.Folders.AddRange(engineBuilds, q1, chassisQa, concessions);

        db.Reports.Add(DemoRevisions.Published(2, "Main Bearing Audit", engineBuilds, EngineBuildsDataset.Build, BuildColumns, versions: 3, daysAgo: 21, batch));
        db.Reports.Add(DemoRevisions.Published(3, "Piston Clearance Report", q1, EngineBuildsDataset.Build, BuildColumns, versions: 1, daysAgo: 9, batch));
        db.Reports.Add(DemoRevisions.Draft(4, "Chassis Torque Audit", chassisQa, TestRunsDataset.Build, TestColumns, daysAgo: 2, batch));
        db.Reports.Add(DemoRevisions.PublishedWithDraft(5, "Chassis Alignment Check", chassisQa, EngineBuildsDataset.Build, BuildColumns, versions: 2, daysAgo: 5, batch));
        db.Reports.Add(DemoRevisions.Empty(6, "Bore Diameter Concessions", concessions, daysAgo: 14));
        db.Reports.Add(DemoRevisions.Draft(7, "Final Assembly QA — Batch 12", null, TestRunsDataset.Build, TestColumns, daysAgo: 1, batch));
    }

    private static Folder NewFolder(string name, Folder? parent, DateTime now)
    {
        return new Folder { RefId = Guid.NewGuid(), Name = name, ParentFolder = parent, CreatedAt = now, UpdatedAt = now };
    }
}
