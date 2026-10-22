using Microsoft.EntityFrameworkCore;

namespace Reporting.Database;

internal static class SeedRowWriters
{
    /// <summary>SQL Server bulk-copies; other providers (the SQLite tests) go through EF in batches.</summary>
    public static ISeedRowWriter For(ReportingDbContext db)
    {
        if (db.Database.IsSqlServer())
        {
            return new SqlBulkSeedRowWriter();
        }

        return new EfSeedRowWriter();
    }
}
