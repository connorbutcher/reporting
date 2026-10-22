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
        DbSeeder.Seed(db);
        DbSeeder.SeedBoxPlotShowcase(db);
        DbSeeder.SeedStackedBarShowcase(db);
        DbSeeder.SeedHistogramShowcase(db);
        DbSeeder.SeedPivotShowcase(db);
        DbSeeder.SeedFeatureShowcase(db);
        DbSeeder.SeedCrossReferenceShowcase(db);
        DbSeeder.SeedIdentity(db);
    }
}
