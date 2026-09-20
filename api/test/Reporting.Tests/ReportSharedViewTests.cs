using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Identity;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// Shared filter snapshots (<see cref="ReportSharedViewService"/>): a link carries only a short id, so
/// these cover minting one, getting the same one back for the same filters, resolving it only on the
/// report it was made for, and the cascades — against a real (SQLite) relational provider so the unique
/// indexes and foreign keys are exercised for real.
/// </summary>
public class ReportSharedViewTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly ReportingDbContext _db;

    public ReportSharedViewTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        using (var pragma = _connection.CreateCommand())
        {
            pragma.CommandText = "PRAGMA foreign_keys = ON";
            pragma.ExecuteNonQuery();
        }

        var options = new DbContextOptionsBuilder<ReportingDbContext>().UseSqlite(_connection).Options;
        _db = new ReportingDbContext(options);
        _db.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    private sealed class FakeAccessor(ReportingDbContext db, int userId) : ICurrentUserAccessor
    {
        public async Task<ICurrentUser> GetAsync()
        {
            var u = await db.Users.Where(x => x.Id == userId).FirstAsync();
            return new CurrentUser(u.Id, u.RefId, u.DisplayName, u.Email, u.IsGlobalAdmin, []);
        }
    }

    private ReportSharedViewService ServiceFor(User user) => new(_db, new FakeAccessor(_db, user.Id));

    private async Task<User> SeedUserAsync(string email)
    {
        var user = new User { RefId = Guid.NewGuid(), Email = email, DisplayName = email, CreatedAt = DateTime.UtcNow };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user;
    }

    private async Task<Report> SeedReportAsync(int number)
    {
        var now = DateTime.UtcNow;
        var report = new Report { RefId = Guid.NewGuid(), Number = number, Name = $"Report {number}", CreatedAt = now, UpdatedAt = now };
        _db.Reports.Add(report);
        await _db.SaveChangesAsync();
        return report;
    }

    [Fact]
    public async Task A_new_snapshot_gets_a_short_lowercase_id_and_reads_back_untouched()
    {
        var user = await SeedUserAsync("a@example.com");
        var report = await SeedReportAsync(1);
        var service = ServiceFor(user);

        var created = await service.CreateAsync(report.Id, "eyJ3MSI6bnVsbH0");

        Assert.Equal(ReportSharedView.ShortIdLength, created.Id.Length);
        Assert.Matches("^[a-z0-9]+$", created.Id);
        var read = await service.GetAsync(report.Id, created.Id);
        Assert.Equal("eyJ3MSI6bnVsbH0", read.Filters);
        Assert.Equal(created.Id, read.Id);
    }

    [Fact]
    public async Task Sharing_the_same_filters_again_returns_the_same_id_without_a_new_row()
    {
        var alice = await SeedUserAsync("alice@example.com");
        var bob = await SeedUserAsync("bob@example.com");
        var report = await SeedReportAsync(1);

        var first = await ServiceFor(alice).CreateAsync(report.Id, "same");
        var again = await ServiceFor(alice).CreateAsync(report.Id, "same");
        var byBob = await ServiceFor(bob).CreateAsync(report.Id, "same");

        Assert.Equal(first.Id, again.Id);
        Assert.Equal(first.Id, byBob.Id);
        Assert.Equal(1, await _db.ReportSharedViews.CountAsync());
        Assert.Equal(alice.Id, (await _db.ReportSharedViews.SingleAsync()).CreatedByUserId);
    }

    [Fact]
    public async Task Different_filters_get_different_ids()
    {
        var user = await SeedUserAsync("a@example.com");
        var report = await SeedReportAsync(1);
        var service = ServiceFor(user);

        var one = await service.CreateAsync(report.Id, "one");
        var two = await service.CreateAsync(report.Id, "two");

        Assert.NotEqual(one.Id, two.Id);
        Assert.Equal("one", (await service.GetAsync(report.Id, one.Id)).Filters);
        Assert.Equal("two", (await service.GetAsync(report.Id, two.Id)).Filters);
    }

    [Fact]
    public async Task An_id_resolves_only_on_the_report_it_was_made_for()
    {
        var user = await SeedUserAsync("a@example.com");
        var first = await SeedReportAsync(1);
        var second = await SeedReportAsync(2);
        var service = ServiceFor(user);

        var shared = await service.CreateAsync(first.Id, "filters");

        Assert.Null((await service.GetAsync(second.Id, shared.Id)).Filters);
        // The same filters on another report are a separate snapshot with their own id.
        var onSecond = await service.CreateAsync(second.Id, "filters");
        Assert.NotEqual(shared.Id, onSecond.Id);
    }

    [Fact]
    public async Task An_unknown_or_malformed_id_reads_as_no_filters_not_an_error()
    {
        var user = await SeedUserAsync("a@example.com");
        var report = await SeedReportAsync(1);
        var service = ServiceFor(user);

        Assert.Null((await service.GetAsync(report.Id, "nosuchview")).Filters);
        Assert.Null((await service.GetAsync(report.Id, new string('x', 500))).Filters);
        Assert.Equal("nosuchview", (await service.GetAsync(report.Id, "nosuchview")).Id);
    }

    [Fact]
    public async Task An_id_is_found_whatever_case_it_is_typed_in()
    {
        var user = await SeedUserAsync("a@example.com");
        var report = await SeedReportAsync(1);
        var service = ServiceFor(user);

        var shared = await service.CreateAsync(report.Id, "filters");

        Assert.Equal("filters", (await service.GetAsync(report.Id, shared.Id.ToUpperInvariant())).Filters);
    }

    [Theory]
    [InlineData("")]
    [InlineData("has spaces")]
    [InlineData("{\"json\":true}")]
    public async Task Filters_that_are_not_url_safe_are_refused_and_nothing_is_stored(string filters)
    {
        var user = await SeedUserAsync("a@example.com");
        var report = await SeedReportAsync(1);

        await Assert.ThrowsAsync<DataValidationException>(() => ServiceFor(user).CreateAsync(report.Id, filters));

        Assert.Equal(0, await _db.ReportSharedViews.CountAsync());
    }

    [Fact]
    public async Task Filters_over_the_size_cap_are_refused()
    {
        var user = await SeedUserAsync("a@example.com");
        var report = await SeedReportAsync(1);

        await Assert.ThrowsAsync<DataValidationException>(
            () => ServiceFor(user).CreateAsync(report.Id, new string('a', ReportViewState.MaxFiltersLength + 1)));
    }

    [Fact]
    public async Task Deleting_the_report_removes_its_snapshots()
    {
        var user = await SeedUserAsync("a@example.com");
        var report = await SeedReportAsync(1);
        await ServiceFor(user).CreateAsync(report.Id, "filters");

        _db.Reports.Remove(report);
        await _db.SaveChangesAsync();

        Assert.Equal(0, await _db.ReportSharedViews.CountAsync());
    }

    [Fact]
    public async Task Removing_the_creator_leaves_the_link_working()
    {
        var alice = await SeedUserAsync("alice@example.com");
        var bob = await SeedUserAsync("bob@example.com");
        var report = await SeedReportAsync(1);
        var shared = await ServiceFor(alice).CreateAsync(report.Id, "filters");

        _db.Users.Remove(alice);
        await _db.SaveChangesAsync();

        Assert.Equal("filters", (await ServiceFor(bob).GetAsync(report.Id, shared.Id)).Filters);
        Assert.Null((await _db.ReportSharedViews.SingleAsync()).CreatedByUserId);
    }
}
