namespace Reporting.Database;

/// <summary>
/// Startup seeding. Each showcase is added only if a report of its name is missing and takes the next free
/// number, so they top up an existing database without touching the user's own reports.
/// </summary>
public static class DbSeeder
{
    public static void SeedIdentity(ReportingDbContext db)
    {
        IdentitySeeder.Seed(db);
    }

    /// <summary>The starter report and demo folder tree; skipped once any report exists.</summary>
    public static void Seed(ReportingDbContext db)
    {
        if (db.Reports.Any())
        {
            return;
        }

        var batch = new SeedBatch();
        db.Reports.Add(DemoReports.BuildStarterReport(batch));
        DemoReports.AddFoldersAndReports(db, batch);
        SaveBatch(db, batch);
    }

    public static void SeedBoxPlotShowcase(ReportingDbContext db)
    {
        SeedShowcase(db, TorqueStudyShowcase.Name, TorqueStudyShowcase.Build);
    }

    public static void SeedStackedBarShowcase(ReportingDbContext db)
    {
        SeedShowcase(db, CostBreakdownShowcase.Name, CostBreakdownShowcase.Build);
    }

    public static void SeedHistogramShowcase(ReportingDbContext db)
    {
        SeedShowcase(db, BoreCapabilityShowcase.Name, BoreCapabilityShowcase.Build);
    }

    public static void SeedPivotShowcase(ReportingDbContext db)
    {
        SeedShowcase(db, ProductionSummaryShowcase.Name, ProductionSummaryShowcase.Build);
    }

    public static void SeedFeatureShowcase(ReportingDbContext db)
    {
        SeedShowcase(db, FeatureTourShowcase.Name, FeatureTourShowcase.Build);
    }

    public static void SeedCrossReferenceShowcase(ReportingDbContext db)
    {
        SeedShowcase(db, CrossReferenceShowcase.Name, CrossReferenceShowcase.Build);
    }

    public static bool NeedsPerformanceShowcase(ReportingDbContext db)
    {
        return !db.Reports.Any(r => r.Name == PerformanceShowcase.Name);
    }

    /// <summary>
    /// The large datasets are written after the report, by bulk copy on SQL Server, all in one transaction so an
    /// interrupted seed leaves nothing behind and is retried on the next start.
    /// </summary>
    public static void SeedPerformanceShowcase(ReportingDbContext db, PerformanceShowcaseSizes sizes)
    {
        if (!NeedsPerformanceShowcase(db))
        {
            return;
        }

        using var transaction = db.Database.BeginTransaction();
        var batch = new SeedBatch();
        var nextNumber = (db.Reports.Max(r => (int?)r.Number) ?? 0) + 1;
        var seed = PerformanceShowcase.Build(batch, nextNumber, sizes);
        db.Reports.Add(seed.Report);
        SaveBatch(db, batch);

        var writer = SeedRowWriters.For(db);
        foreach (var source in seed.Sources)
        {
            writer.Write(db, source);
        }

        transaction.Commit();
    }

    private static void SeedShowcase(ReportingDbContext db, string name, Func<SeedBatch, int, Report> build)
    {
        if (db.Reports.Any(r => r.Name == name))
        {
            return;
        }

        var batch = new SeedBatch();
        var nextNumber = (db.Reports.Max(r => (int?)r.Number) ?? 0) + 1;
        db.Reports.Add(build(batch, nextNumber));
        SaveBatch(db, batch);
    }

    /// <summary>Saves once to assign ids, then fills in everything that referenced them.</summary>
    private static void SaveBatch(ReportingDbContext db, SeedBatch batch)
    {
        db.SaveChanges();
        batch.Apply(db);
        db.SaveChanges();
    }
}
