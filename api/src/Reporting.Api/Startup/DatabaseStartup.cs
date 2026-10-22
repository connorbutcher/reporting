using Microsoft.EntityFrameworkCore;
using Reporting.Database;

namespace Reporting.Api;

public static class DatabaseStartup
{
    public static void MigrateAndSeed(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ReportingDbContext>();
        db.Database.Migrate();
        // Users first: the feature tour's seeded comments are written by the demo users.
        DbSeeder.SeedIdentity(db);
        DbSeeder.Seed(db);
        DbSeeder.SeedBoxPlotShowcase(db);
        DbSeeder.SeedStackedBarShowcase(db);
        DbSeeder.SeedHistogramShowcase(db);
        DbSeeder.SeedPivotShowcase(db);
        DbSeeder.SeedFeatureShowcase(db);
        DbSeeder.SeedCrossReferenceShowcase(db);
        SeedPerformanceShowcase(scope.ServiceProvider, db);
    }

    /// <summary>On by default; set Seeding:PerformanceShowcase to false to skip the 1.1 million generated rows.</summary>
    private static void SeedPerformanceShowcase(IServiceProvider services, ReportingDbContext db)
    {
        var enabled = services.GetRequiredService<IConfiguration>().GetValue("Seeding:PerformanceShowcase", true);
        if (!enabled || !DbSeeder.NeedsPerformanceShowcase(db))
        {
            return;
        }

        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(DatabaseStartup));
        logger.LogInformation("Seeding the Performance at Scale report (1.1 million rows). This runs once.");
        DbSeeder.SeedPerformanceShowcase(db, PerformanceShowcaseSizes.Full);
        logger.LogInformation("Seeded the Performance at Scale report.");
    }
}
