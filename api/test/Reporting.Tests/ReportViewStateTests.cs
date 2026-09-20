using Microsoft.EntityFrameworkCore;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>Saved viewing filters: storing, isolating per user and report, replacing, clearing and refusing a malformed value. Runs on SQLite so the unique index and cascades are real.</summary>
public class ReportViewStateTests : SqliteDbTestBase
{
    private ReportViewStateService ServiceFor(User user) => new(Db, Acting(user));

    [Fact]
    public async Task Nothing_is_saved_until_the_user_saves_something()
    {
        var user = await SeedUserAsync("a@example.com");
        var report = await SeedReportAsync(1);

        Assert.Null(await ServiceFor(user).GetAsync(report.Id));
    }

    [Fact]
    public async Task Saved_filters_are_returned_untouched()
    {
        var user = await SeedUserAsync("a@example.com");
        var report = await SeedReportAsync(1);
        var service = ServiceFor(user);

        await service.SaveAsync(report.Id, "eyJ3MSI6bnVsbH0");

        Assert.Equal("eyJ3MSI6bnVsbH0", await service.GetAsync(report.Id));
    }

    [Fact]
    public async Task Saving_again_replaces_the_earlier_filters_in_the_same_row()
    {
        var user = await SeedUserAsync("a@example.com");
        var report = await SeedReportAsync(1);
        var service = ServiceFor(user);

        await service.SaveAsync(report.Id, "first");
        await service.SaveAsync(report.Id, "second");

        Assert.Equal("second", await service.GetAsync(report.Id));
        Assert.Equal(1, await Db.ReportViewStates.CountAsync());
    }

    [Fact]
    public async Task Each_user_and_each_report_keeps_its_own_filters()
    {
        var alice = await SeedUserAsync("alice@example.com");
        var bob = await SeedUserAsync("bob@example.com");
        var first = await SeedReportAsync(1);
        var second = await SeedReportAsync(2);

        await ServiceFor(alice).SaveAsync(first.Id, "alice1");
        await ServiceFor(alice).SaveAsync(second.Id, "alice2");
        await ServiceFor(bob).SaveAsync(first.Id, "bob1");

        Assert.Equal("alice1", await ServiceFor(alice).GetAsync(first.Id));
        Assert.Equal("alice2", await ServiceFor(alice).GetAsync(second.Id));
        Assert.Equal("bob1", await ServiceFor(bob).GetAsync(first.Id));
        Assert.Null(await ServiceFor(bob).GetAsync(second.Id));
    }

    [Fact]
    public async Task Clearing_forgets_only_the_callers_filters_and_is_idempotent()
    {
        var alice = await SeedUserAsync("alice@example.com");
        var bob = await SeedUserAsync("bob@example.com");
        var report = await SeedReportAsync(1);
        await ServiceFor(alice).SaveAsync(report.Id, "alice");
        await ServiceFor(bob).SaveAsync(report.Id, "bob");

        await ServiceFor(alice).ClearAsync(report.Id);
        await ServiceFor(alice).ClearAsync(report.Id);

        Assert.Null(await ServiceFor(alice).GetAsync(report.Id));
        Assert.Equal("bob", await ServiceFor(bob).GetAsync(report.Id));
    }

    [Fact]
    public async Task Saving_updates_the_timestamp()
    {
        var user = await SeedUserAsync("a@example.com");
        var report = await SeedReportAsync(1);
        var service = ServiceFor(user);
        await service.SaveAsync(report.Id, "first");
        var before = (await Db.ReportViewStates.AsNoTracking().SingleAsync()).UpdatedAt;

        await Task.Delay(20);
        await service.SaveAsync(report.Id, "second");

        Assert.True((await Db.ReportViewStates.AsNoTracking().SingleAsync()).UpdatedAt > before);
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

        await Assert.ThrowsAsync<DataValidationException>(() => ServiceFor(user).SaveAsync(report.Id, filters));

        Assert.Equal(0, await Db.ReportViewStates.CountAsync());
    }

    [Fact]
    public async Task A_value_over_the_size_cap_is_refused_but_one_at_the_cap_is_kept()
    {
        var user = await SeedUserAsync("a@example.com");
        var report = await SeedReportAsync(1);
        var service = ServiceFor(user);

        await service.SaveAsync(report.Id, new string('a', ReportViewState.MaxFiltersLength));
        await Assert.ThrowsAsync<DataValidationException>(
            () => service.SaveAsync(report.Id, new string('a', ReportViewState.MaxFiltersLength + 1)));

        Assert.Equal(ReportViewState.MaxFiltersLength, (await service.GetAsync(report.Id))!.Length);
    }

    [Fact]
    public async Task Deleting_the_report_or_the_user_removes_their_saved_filters()
    {
        var alice = await SeedUserAsync("alice@example.com");
        var bob = await SeedUserAsync("bob@example.com");
        var first = await SeedReportAsync(1);
        var second = await SeedReportAsync(2);
        await ServiceFor(alice).SaveAsync(first.Id, "a1");
        await ServiceFor(bob).SaveAsync(second.Id, "b2");

        Db.Reports.Remove(first);
        Db.Users.Remove(bob);
        await Db.SaveChangesAsync();

        Assert.Equal(0, await Db.ReportViewStates.CountAsync());
    }
}
