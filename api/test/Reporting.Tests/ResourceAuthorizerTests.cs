using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Identity;
using Reporting.DAL.Permissions;
using Reporting.DAL.Repositories;
using Reporting.Database;
using Xunit;

namespace Reporting.Tests;

/// <summary>
/// Exercises the one place every report/folder/dataset access decision is made
/// (<see cref="ResourceAuthorizer"/>) against a real (SQLite) relational provider, covering the
/// 404/403/400 masking matrix a non-admin user sees: hidden ⇒ NotFound, visible-but-insufficient ⇒
/// Forbidden, a mutation on a published version ⇒ ReadOnly, and the draft-only-report visibility rule.
/// </summary>
public class ResourceAuthorizerTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly ReportingDbContext _db;

    public ResourceAuthorizerTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<ReportingDbContext>().UseSqlite(_connection).Options;
        _db = new ReportingDbContext(options);
        // EnsureCreated applies the model's HasData, which seeds the fixed DatasetSource reference rows.
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
            var u = await db.Users
                .Where(x => x.Id == userId)
                .Select(x => new { x.Id, x.RefId, x.DisplayName, x.Email, x.IsGlobalAdmin, GroupIds = x.Memberships.Select(m => m.UserGroupId).ToList() })
                .FirstAsync();
            return new CurrentUser(u.Id, u.RefId, u.DisplayName, u.Email, u.IsGlobalAdmin, u.GroupIds);
        }
    }

    private ResourceAuthorizer Authorizer(int userId)
    {
        var accessor = new FakeAccessor(_db, userId);
        var permissions = new PermissionService(_db, accessor);
        return new ResourceAuthorizer(_db, permissions, new DatasetRepository(_db));
    }

    private async Task<User> SeedUserAsync(bool admin = false)
    {
        var user = new User { RefId = Guid.NewGuid(), Email = $"u{Guid.NewGuid():N}@x", DisplayName = "U", IsGlobalAdmin = admin, CreatedAt = DateTime.UtcNow };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user;
    }

    /// <summary>Seeds a report with a published version (so it's visible to a viewer), optionally in a folder.</summary>
    private async Task<Report> SeedReportAsync(int? folderId = null, bool published = true)
    {
        var report = new Report
        {
            RefId = Guid.NewGuid(),
            Number = Random.Shared.Next(1, 1_000_000),
            Name = "R",
            FolderId = folderId,
            InheritsPermissions = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        report.Revisions.Add(new ReportRevision
        {
            RefId = Guid.NewGuid(),
            Kind = published ? RevisionKind.Published : RevisionKind.Draft,
            VersionNumber = published ? 1 : null,
            CreatedAt = DateTime.UtcNow,
            PublishedAt = published ? DateTime.UtcNow : null
        });
        _db.Reports.Add(report);
        await _db.SaveChangesAsync();
        return report;
    }

    private async Task GrantReportAsync(int reportId, int userId, AccessLevel level)
    {
        _db.AccessGrants.Add(new AccessGrant
        {
            SecurableType = SecurableType.Report,
            ReportId = reportId,
            SubjectType = GrantSubjectType.User,
            UserId = userId,
            Level = level,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = userId
        });
        await _db.SaveChangesAsync();
    }

    // --- reports ----------------------------------------------------------

    [Fact]
    public async Task Report_with_no_grant_is_hidden_as_NotFound()
    {
        var user = await SeedUserAsync();
        var report = await SeedReportAsync();

        var auth = await Authorizer(user.Id).AuthorizeReportAsync(report.Id, AccessLevel.Viewer);
        Assert.Equal(AccessOutcome.NotFound, auth.Outcome);
    }

    [Fact]
    public async Task Visible_report_below_required_level_is_Forbidden()
    {
        var user = await SeedUserAsync();
        var report = await SeedReportAsync();
        await GrantReportAsync(report.Id, user.Id, AccessLevel.Viewer);

        var auth = await Authorizer(user.Id).AuthorizeReportAsync(report.Id, AccessLevel.Editor);
        Assert.Equal(AccessOutcome.Forbidden, auth.Outcome);
        Assert.Equal(AccessLevel.Viewer, auth.Level);
    }

    [Fact]
    public async Task Report_at_or_above_required_level_is_Allowed()
    {
        var user = await SeedUserAsync();
        var report = await SeedReportAsync();
        await GrantReportAsync(report.Id, user.Id, AccessLevel.Editor);

        var auth = await Authorizer(user.Id).AuthorizeReportAsync(report.Id, AccessLevel.Editor);
        Assert.True(auth.Allowed);
    }

    [Fact]
    public async Task Draft_only_report_is_hidden_from_a_viewer_but_visible_to_an_editor()
    {
        var user = await SeedUserAsync();
        var report = await SeedReportAsync(published: false); // no published version yet

        await GrantReportAsync(report.Id, user.Id, AccessLevel.Viewer);
        Assert.Equal(AccessOutcome.NotFound, (await Authorizer(user.Id).AuthorizeReportAsync(report.Id, AccessLevel.Viewer)).Outcome);

        // Bump the same user to Editor: the draft-only report becomes visible.
        var grant = await _db.AccessGrants.FirstAsync(g => g.ReportId == report.Id && g.UserId == user.Id);
        grant.Level = AccessLevel.Editor;
        await _db.SaveChangesAsync();
        Assert.True((await Authorizer(user.Id).AuthorizeReportAsync(report.Id, AccessLevel.Editor)).Allowed);
    }

    [Fact]
    public async Task Global_admin_is_allowed_everywhere()
    {
        var admin = await SeedUserAsync(admin: true);
        var report = await SeedReportAsync();

        var auth = await Authorizer(admin.Id).AuthorizeReportAsync(report.Id, AccessLevel.Manager);
        Assert.True(auth.Allowed);
        Assert.Equal(AccessLevel.Manager, auth.Level);
    }

    // --- datasets ---------------------------------------------------------

    [Fact]
    public async Task Mutating_a_published_versions_dataset_is_ReadOnly()
    {
        var user = await SeedUserAsync();
        var report = await SeedReportAsync();               // has a published revision
        await GrantReportAsync(report.Id, user.Id, AccessLevel.Editor);

        var publishedRevision = await _db.ReportRevisions.FirstAsync(rv => rv.ReportId == report.Id);
        var dataset = new Dataset { ReportRevisionId = publishedRevision.Id, Name = "D", DatasetSourceId = DatasetSourceIds.Assembly };
        _db.Datasets.Add(dataset);
        await _db.SaveChangesAsync();

        var read = await Authorizer(user.Id).AuthorizeDatasetAsync(dataset.Id, AccessLevel.Viewer, mutation: false);
        Assert.True(read.Allowed);

        var write = await Authorizer(user.Id).AuthorizeDatasetAsync(dataset.Id, AccessLevel.Editor, mutation: true);
        Assert.Equal(AccessOutcome.ReadOnly, write.Outcome);
    }

    [Fact]
    public async Task Missing_dataset_is_NotFound()
    {
        var user = await SeedUserAsync();
        var auth = await Authorizer(user.Id).AuthorizeDatasetAsync(999, AccessLevel.Viewer, mutation: false);
        Assert.Equal(AccessOutcome.NotFound, auth.Outcome);
    }
}
