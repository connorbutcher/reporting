using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Identity;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>An in-memory SQLite database (foreign keys on by default, so cascades run), plus seeding and a current-user stub.</summary>
public abstract class SqliteDbTestBase : IDisposable
{
    private readonly SqliteConnection _connection;

    protected SqliteDbTestBase(bool foreignKeys = true)
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        using (var pragma = _connection.CreateCommand())
        {
            pragma.CommandText = $"PRAGMA foreign_keys = {(foreignKeys ? "ON" : "OFF")}";
            pragma.ExecuteNonQuery();
        }

        Db = new ReportingDbContext(new DbContextOptionsBuilder<ReportingDbContext>().UseSqlite(_connection).Options);
        Db.Database.EnsureCreated();
    }

    protected ReportingDbContext Db { get; }

    public void Dispose()
    {
        Db.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    protected async Task<User> SeedUserAsync(string email)
    {
        var user = new User { RefId = Guid.NewGuid(), Email = email, DisplayName = email, CreatedAt = DateTime.UtcNow };
        Db.Users.Add(user);
        await Db.SaveChangesAsync();
        return user;
    }

    protected async Task<Report> SeedReportAsync(int number)
    {
        var now = DateTime.UtcNow;
        var report = new Report { RefId = Guid.NewGuid(), Number = number, Name = $"Report {number}", CreatedAt = now, UpdatedAt = now };
        Db.Reports.Add(report);
        await Db.SaveChangesAsync();
        return report;
    }

    protected ICurrentUserAccessor Acting(User user) => new FixedAccessor(Db, user.Id);

    private sealed class FixedAccessor(ReportingDbContext db, int userId) : ICurrentUserAccessor
    {
        public async Task<ICurrentUser> GetAsync()
        {
            var u = await db.Users.Where(x => x.Id == userId).FirstAsync();
            return new CurrentUser(u.Id, u.RefId, u.DisplayName, u.Email, u.IsGlobalAdmin, []);
        }
    }
}
