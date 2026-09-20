using Microsoft.EntityFrameworkCore;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>Shared filter snapshots: minting a short id, getting the same one for the same filters, resolving it only on its own report, and the cascades. Runs on SQLite so the unique indexes and foreign keys are real.</summary>
public class ReportSharedViewTests : SqliteDbTestBase
{
    private ReportSharedViewService ServiceFor(User user) => new(Db, Acting(user));

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
        Assert.Equal(1, await Db.ReportSharedViews.CountAsync());
        Assert.Equal(alice.Id, (await Db.ReportSharedViews.SingleAsync()).CreatedByUserId);
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
        var onSecond = await service.CreateAsync(second.Id, "filters");
        Assert.NotEqual(shared.Id, onSecond.Id);
    }

    [Fact]
    public async Task An_unknown_or_malformed_id_reads_as_no_filters_not_an_error()
    {
        var user = await SeedUserAsync("a@example.com");
        var report = await SeedReportAsync(1);
        var service = ServiceFor(user);

        var unknown = await service.GetAsync(report.Id, "nosuchview");

        Assert.Null(unknown.Filters);
        Assert.Equal("nosuchview", unknown.Id);
        Assert.Null((await service.GetAsync(report.Id, new string('x', 500))).Filters);
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

        Assert.Equal(0, await Db.ReportSharedViews.CountAsync());
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

        Db.Reports.Remove(report);
        await Db.SaveChangesAsync();

        Assert.Equal(0, await Db.ReportSharedViews.CountAsync());
    }

    [Fact]
    public async Task Removing_the_creator_leaves_the_link_working()
    {
        var alice = await SeedUserAsync("alice@example.com");
        var bob = await SeedUserAsync("bob@example.com");
        var report = await SeedReportAsync(1);
        var shared = await ServiceFor(alice).CreateAsync(report.Id, "filters");

        Db.Users.Remove(alice);
        await Db.SaveChangesAsync();

        Assert.Equal("filters", (await ServiceFor(bob).GetAsync(report.Id, shared.Id)).Filters);
        Assert.Null((await Db.ReportSharedViews.SingleAsync()).CreatedByUserId);
    }
}
