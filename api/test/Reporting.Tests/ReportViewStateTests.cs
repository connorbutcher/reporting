using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Identity;
using Reporting.DAL.Permissions;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// The per-user saved viewing filters in <see cref="ReportPersonalizationService"/>, against a real
/// (SQLite) relational provider so the per-(user, report) uniqueness and the cascades run through
/// actual SQL. The filters string is the front-end's opaque encoding; these tests only cover storing,
/// isolating, replacing and clearing it, and refusing a value that isn't shaped like the encoding.
/// </summary>
public class ReportViewStateTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly ReportingDbContext _db;

    public ReportViewStateTests()
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

    private ReportPersonalizationService ServiceFor(int userId)
    {
        var accessor = new FakeAccessor(_db, userId);
        var authorizer = new ResourceAuthorizer(_db, new PermissionService(_db, accessor), new DatasetRepository(_db));
        return new ReportPersonalizationService(_db, authorizer, accessor);
    }

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
    public async Task Nothing_is_saved_until_the_user_saves_something()
    {
        var user = await SeedUserAsync("a@example.com");
        var report = await SeedReportAsync(1);

        Assert.Null(await ServiceFor(user.Id).GetViewFiltersAsync(report.Id));
    }

    [Fact]
    public async Task Saved_filters_are_returned_untouched()
    {
        var user = await SeedUserAsync("a@example.com");
        var report = await SeedReportAsync(1);
        var service = ServiceFor(user.Id);

        await service.SaveViewFiltersAsync(report.Id, "eyJ3MSI6bnVsbH0");

        Assert.Equal("eyJ3MSI6bnVsbH0", await service.GetViewFiltersAsync(report.Id));
    }

    [Fact]
    public async Task Saving_again_replaces_the_earlier_filters_in_the_same_row()
    {
        var user = await SeedUserAsync("a@example.com");
        var report = await SeedReportAsync(1);
        var service = ServiceFor(user.Id);

        await service.SaveViewFiltersAsync(report.Id, "first");
        await service.SaveViewFiltersAsync(report.Id, "second");

        Assert.Equal("second", await service.GetViewFiltersAsync(report.Id));
        Assert.Equal(1, await _db.ReportViewStates.CountAsync());
    }

    [Fact]
    public async Task Each_user_and_each_report_keeps_its_own_filters()
    {
        var alice = await SeedUserAsync("alice@example.com");
        var bob = await SeedUserAsync("bob@example.com");
        var first = await SeedReportAsync(1);
        var second = await SeedReportAsync(2);

        await ServiceFor(alice.Id).SaveViewFiltersAsync(first.Id, "alice1");
        await ServiceFor(alice.Id).SaveViewFiltersAsync(second.Id, "alice2");
        await ServiceFor(bob.Id).SaveViewFiltersAsync(first.Id, "bob1");

        Assert.Equal("alice1", await ServiceFor(alice.Id).GetViewFiltersAsync(first.Id));
        Assert.Equal("alice2", await ServiceFor(alice.Id).GetViewFiltersAsync(second.Id));
        Assert.Equal("bob1", await ServiceFor(bob.Id).GetViewFiltersAsync(first.Id));
        Assert.Null(await ServiceFor(bob.Id).GetViewFiltersAsync(second.Id));
    }

    [Fact]
    public async Task Clearing_forgets_only_the_callers_filters_and_is_idempotent()
    {
        var alice = await SeedUserAsync("alice@example.com");
        var bob = await SeedUserAsync("bob@example.com");
        var report = await SeedReportAsync(1);
        await ServiceFor(alice.Id).SaveViewFiltersAsync(report.Id, "alice");
        await ServiceFor(bob.Id).SaveViewFiltersAsync(report.Id, "bob");

        await ServiceFor(alice.Id).ClearViewFiltersAsync(report.Id);
        await ServiceFor(alice.Id).ClearViewFiltersAsync(report.Id);

        Assert.Null(await ServiceFor(alice.Id).GetViewFiltersAsync(report.Id));
        Assert.Equal("bob", await ServiceFor(bob.Id).GetViewFiltersAsync(report.Id));
    }

    [Theory]
    [InlineData("")]
    [InlineData("has spaces")]
    [InlineData("a+b/c=")]
    [InlineData("{\"json\":true}")]
    [InlineData("<script>")]
    public async Task A_value_that_is_not_url_safe_is_refused_and_nothing_is_stored(string filters)
    {
        var user = await SeedUserAsync("a@example.com");
        var report = await SeedReportAsync(1);

        await Assert.ThrowsAsync<DataValidationException>(() => ServiceFor(user.Id).SaveViewFiltersAsync(report.Id, filters));

        Assert.Equal(0, await _db.ReportViewStates.CountAsync());
    }

    [Fact]
    public async Task A_value_over_the_size_cap_is_refused_but_one_at_the_cap_is_kept()
    {
        var user = await SeedUserAsync("a@example.com");
        var report = await SeedReportAsync(1);
        var service = ServiceFor(user.Id);

        await service.SaveViewFiltersAsync(report.Id, new string('a', ReportViewState.MaxFiltersLength));
        await Assert.ThrowsAsync<DataValidationException>(
            () => service.SaveViewFiltersAsync(report.Id, new string('a', ReportViewState.MaxFiltersLength + 1)));

        Assert.Equal(ReportViewState.MaxFiltersLength, (await service.GetViewFiltersAsync(report.Id))!.Length);
    }

    [Fact]
    public async Task Deleting_the_report_or_the_user_removes_their_saved_filters()
    {
        var alice = await SeedUserAsync("alice@example.com");
        var bob = await SeedUserAsync("bob@example.com");
        var first = await SeedReportAsync(1);
        var second = await SeedReportAsync(2);
        await ServiceFor(alice.Id).SaveViewFiltersAsync(first.Id, "a1");
        await ServiceFor(bob.Id).SaveViewFiltersAsync(second.Id, "b2");

        _db.Reports.Remove(first);
        _db.Users.Remove(bob);
        await _db.SaveChangesAsync();

        Assert.Equal(0, await _db.ReportViewStates.CountAsync());
    }
}
