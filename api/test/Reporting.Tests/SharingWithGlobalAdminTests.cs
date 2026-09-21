using Reporting.Abstractions;
using Reporting.DAL.Permissions;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// A global admin's access is inferred from that status, so a report can't be shared with one —
/// the sharing picker hides them, and the service refuses if one is named anyway.
/// </summary>
public class SharingWithGlobalAdminTests : SqliteDbTestBase
{
    private async Task<User> SeedAdminAsync()
    {
        var admin = await SeedUserAsync("admin@x");
        admin.IsGlobalAdmin = true;
        await Db.SaveChangesAsync();
        return admin;
    }

    private static SaveGrantDto ViewerGrant(User user) =>
        new() { SubjectType = GrantSubjectType.User, SubjectId = user.RefId, Level = AccessLevel.Viewer };

    [Fact]
    public async Task Sharing_a_report_with_a_global_admin_is_refused()
    {
        var admin = await SeedAdminAsync();
        var report = await SeedReportAsync(1);
        var service = new PermissionAdminService(Db, Acting(admin));

        var ex = await Assert.ThrowsAsync<DataValidationException>(() =>
            service.UpsertReportGrantAsync(report.Id, ViewerGrant(admin)));

        Assert.Contains("global administrator", ex.Message);
        Assert.Empty(Db.AccessGrants);
    }

    [Fact]
    public async Task Sharing_a_report_with_an_ordinary_person_still_works()
    {
        var admin = await SeedAdminAsync();
        var bob = await SeedUserAsync("bob@x");
        var report = await SeedReportAsync(1);

        var grant = await new PermissionAdminService(Db, Acting(admin)).UpsertReportGrantAsync(report.Id, ViewerGrant(bob));

        Assert.NotNull(grant);
        Assert.Single(Db.AccessGrants);
    }

    [Fact]
    public async Task A_stale_grant_to_someone_who_is_now_a_global_admin_can_still_be_removed()
    {
        var bob = await SeedUserAsync("bob@x");
        var admin = await SeedAdminAsync();
        var report = await SeedReportAsync(1);
        var service = new PermissionAdminService(Db, Acting(admin));
        await service.UpsertReportGrantAsync(report.Id, ViewerGrant(bob));

        // Bob is later made a global admin: his old grant is now redundant, and must be removable.
        bob.IsGlobalAdmin = true;
        await Db.SaveChangesAsync();

        Assert.True(await service.RemoveReportGrantAsync(report.Id, new RemoveGrantDto
        {
            SubjectType = GrantSubjectType.User,
            SubjectId = bob.RefId,
        }));
        Assert.Empty(Db.AccessGrants);
    }
}
