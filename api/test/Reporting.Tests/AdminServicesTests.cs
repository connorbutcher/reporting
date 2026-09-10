using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Identity;
using Reporting.DAL.Permissions;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// Exercises the admin-area directory services (<see cref="UserAdminService"/>,
/// <see cref="UserGroupAdminService"/>) and the app-permission guard
/// (<see cref="AppPermissionService"/>) against a real (SQLite) relational provider, so the
/// grant resolution, membership reconciliation, and validation all run through actual SQL.
/// </summary>
public class AdminServicesTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly ReportingDbContext _db;

    public AdminServicesTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        // SQLite enforces foreign keys (and so ON DELETE CASCADE) only when this is on per
        // connection; the grant tables' cascade behaviour is exactly what these tests check.
        using (var pragma = _connection.CreateCommand())
        {
            pragma.CommandText = "PRAGMA foreign_keys = ON";
            pragma.ExecuteNonQuery();
        }

        var options = new DbContextOptionsBuilder<ReportingDbContext>()
            .UseSqlite(_connection)
            .Options;
        _db = new ReportingDbContext(options);
        _db.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    /// <summary>A fixed current-user stub; flip <paramref name="isAdmin"/> to test the guard.</summary>
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

    private async Task<User> SeedUserAsync(string email, string name, bool admin = false)
    {
        var user = new User { RefId = Guid.NewGuid(), Email = email, DisplayName = name, IsGlobalAdmin = admin, CreatedAt = DateTime.UtcNow };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user;
    }

    private AppPermissionService AppPerms(int actingUserId) => new(_db, new FakeAccessor(_db, actingUserId));
    private UserAdminService Users(int actingUserId) => new(_db, new FakeAccessor(_db, actingUserId));
    private UserGroupAdminService Groups(int actingUserId) => new(_db, AppPerms(actingUserId), new FakeAccessor(_db, actingUserId));

    // --- app-permission guard (the primitive the [RequireAppPermission] attribute enforces) ----

    [Fact]
    public async Task Non_admin_without_permission_lacks_manage_users_and_require_throws()
    {
        var user = await SeedUserAsync("u@x", "U");
        Assert.False(await AppPerms(user.Id).HasAsync(AppPermission.ManageUsers));
        var ex = await Assert.ThrowsAsync<AccessDeniedException>(() => AppPerms(user.Id).RequireAsync(AppPermission.ManageUsers));
        Assert.Contains("manage-users", ex.Message);
    }

    [Fact]
    public async Task Global_admin_holds_manage_users()
    {
        var admin = await SeedUserAsync("a@x", "A", admin: true);
        Assert.True(await AppPerms(admin.Id).HasAsync(AppPermission.ManageUsers));
        var list = await Users(admin.Id).ListAsync();
        Assert.Single(list);
    }

    [Fact]
    public async Task Direct_grant_and_group_grant_both_confer_manage_users()
    {
        var admin = await SeedUserAsync("a@x", "A", admin: true);
        var direct = await SeedUserAsync("d@x", "D");
        var viaGroup = await SeedUserAsync("g@x", "G");

        // Direct grant on `direct`.
        await Users(admin.Id).UpdateAsync(direct.RefId, new SaveUserDto { DisplayName = "D", CanManageUsers = true });
        // Group grant covering `viaGroup`.
        var group = await Groups(admin.Id).CreateAsync(new SaveGroupDto { Name = "Admins", CanManageUsers = true, MemberIds = [viaGroup.RefId] });

        Assert.True(await AppPerms(direct.Id).HasAsync(AppPermission.ManageUsers));
        Assert.True(await AppPerms(viaGroup.Id).HasAsync(AppPermission.ManageUsers));
        Assert.NotNull(group);
    }

    // --- users ------------------------------------------------------------

    [Fact]
    public async Task Create_user_persists_and_rejects_duplicate_email()
    {
        var admin = await SeedUserAsync("a@x", "A", admin: true);

        var created = await Users(admin.Id).CreateAsync(new SaveUserDto { DisplayName = "New Person", Email = "new@x.io" });
        Assert.Equal("New Person", created.DisplayName);

        await Assert.ThrowsAsync<DataValidationException>(() =>
            Users(admin.Id).CreateAsync(new SaveUserDto { DisplayName = "Dup", Email = "new@x.io" }));
    }

    [Fact]
    public async Task Create_user_rejects_bad_email_and_blank_name()
    {
        var admin = await SeedUserAsync("a@x", "A", admin: true);
        await Assert.ThrowsAsync<DataValidationException>(() =>
            Users(admin.Id).CreateAsync(new SaveUserDto { DisplayName = "X", Email = "not-an-email" }));
        await Assert.ThrowsAsync<DataValidationException>(() =>
            Users(admin.Id).CreateAsync(new SaveUserDto { DisplayName = "  ", Email = "ok@x.io" }));
    }

    [Fact]
    public async Task Edit_user_updates_name_memberships_and_permission()
    {
        var admin = await SeedUserAsync("a@x", "A", admin: true);
        var target = await SeedUserAsync("t@x", "Target");
        var g1 = await Groups(admin.Id).CreateAsync(new SaveGroupDto { Name = "G1" });
        var g2 = await Groups(admin.Id).CreateAsync(new SaveGroupDto { Name = "G2" });

        await Users(admin.Id).UpdateAsync(target.RefId, new SaveUserDto
        {
            DisplayName = "Renamed",
            CanManageUsers = true,
            GroupIds = [g1.Id, g2.Id]
        });

        var detail = await Users(admin.Id).GetAsync(target.RefId);
        Assert.NotNull(detail);
        Assert.Equal("Renamed", detail!.DisplayName);
        Assert.True(detail.CanManageUsers);
        Assert.Equal(2, detail.Groups.Count);

        // Remove one group and the permission; membership set replaces, not merges.
        await Users(admin.Id).UpdateAsync(target.RefId, new SaveUserDto
        {
            DisplayName = "Renamed",
            CanManageUsers = false,
            GroupIds = [g2.Id]
        });
        var after = await Users(admin.Id).GetAsync(target.RefId);
        Assert.False(after!.CanManageUsers);
        Assert.Single(after.Groups);
        Assert.Equal("G2", after.Groups[0].Name);
    }

    [Fact]
    public async Task User_cannot_revoke_their_own_manage_users_permission()
    {
        var admin = await SeedUserAsync("a@x", "A", admin: true);
        var selfAdmin = await SeedUserAsync("s@x", "Self");
        await Users(admin.Id).UpdateAsync(selfAdmin.RefId, new SaveUserDto { DisplayName = "Self", CanManageUsers = true });

        // Acting as themselves, they may not turn off their own permission.
        await Assert.ThrowsAsync<DataValidationException>(() =>
            Users(selfAdmin.Id).UpdateAsync(selfAdmin.RefId, new SaveUserDto { DisplayName = "Self", CanManageUsers = false }));
    }

    // --- groups -----------------------------------------------------------

    [Fact]
    public async Task Create_group_rejects_duplicate_name()
    {
        var admin = await SeedUserAsync("a@x", "A", admin: true);
        await Groups(admin.Id).CreateAsync(new SaveGroupDto { Name = "QA" });
        await Assert.ThrowsAsync<DataValidationException>(() =>
            Groups(admin.Id).CreateAsync(new SaveGroupDto { Name = "QA" }));
    }

    [Fact]
    public async Task Delete_group_removes_membership_and_grants()
    {
        var admin = await SeedUserAsync("a@x", "A", admin: true);
        var member = await SeedUserAsync("m@x", "Member");
        var group = await Groups(admin.Id).CreateAsync(new SaveGroupDto { Name = "Temp", CanManageUsers = true, MemberIds = [member.RefId] });

        // An ACL grant to the group, to prove the cascade (not app code) cleans it up too.
        var gid = await _db.UserGroups.Where(g => g.RefId == group.Id).Select(g => g.Id).FirstAsync();
        _db.AccessGrants.Add(new AccessGrant { SecurableType = SecurableType.Root, SubjectType = GrantSubjectType.Group, UserGroupId = gid, Level = AccessLevel.Viewer, CreatedAt = DateTime.UtcNow });
        await _db.SaveChangesAsync();

        Assert.True(await Groups(admin.Id).DeleteAsync(group.Id));

        Assert.False(await _db.UserGroups.AnyAsync(g => g.Id == gid));
        Assert.False(await _db.UserGroupMembers.AnyAsync(m => m.UserGroupId == gid));
        Assert.False(await _db.AccessGrants.AnyAsync(a => a.SubjectType == GrantSubjectType.Group && a.UserGroupId == gid));
        Assert.False(await _db.AppPermissionGrants.AnyAsync(a => a.SubjectType == GrantSubjectType.Group && a.UserGroupId == gid));
    }

    // --- referential integrity --------------------------------------------

    [Fact]
    public async Task Deleting_a_folder_cascades_its_grants()
    {
        var now = DateTime.UtcNow;
        var folder = new Folder { RefId = Guid.NewGuid(), Name = "F", CreatedAt = now, UpdatedAt = now };
        _db.Folders.Add(folder);
        await _db.SaveChangesAsync();

        _db.AccessGrants.Add(new AccessGrant { SecurableType = SecurableType.Folder, FolderId = folder.Id, SubjectType = GrantSubjectType.Everyone, Level = AccessLevel.Viewer, CreatedAt = now });
        await _db.SaveChangesAsync();

        _db.Folders.Remove(folder);
        await _db.SaveChangesAsync();

        // Previously this grant would have been orphaned; the cascading FK removes it.
        Assert.False(await _db.AccessGrants.AnyAsync(a => a.FolderId == folder.Id));
    }

    [Fact]
    public async Task A_grant_to_a_missing_user_is_rejected()
    {
        _db.AccessGrants.Add(new AccessGrant
        {
            SecurableType = SecurableType.Root,
            SubjectType = GrantSubjectType.User,
            UserId = 987654, // no such user
            Level = AccessLevel.Viewer,
            CreatedAt = DateTime.UtcNow
        });
        await Assert.ThrowsAnyAsync<DbUpdateException>(() => _db.SaveChangesAsync());
    }

    [Fact]
    public async Task A_grant_whose_type_and_foreign_key_disagree_is_rejected()
    {
        var user = await SeedUserAsync("chk@x", "Chk");
        // Says "User" but carries a group foreign key — the CHECK constraint must refuse it.
        _db.AccessGrants.Add(new AccessGrant
        {
            SecurableType = SecurableType.Root,
            SubjectType = GrantSubjectType.User,
            UserGroupId = user.Id,
            Level = AccessLevel.Viewer,
            CreatedAt = DateTime.UtcNow
        });
        await Assert.ThrowsAnyAsync<DbUpdateException>(() => _db.SaveChangesAsync());
    }

    // --- delegated group managers -----------------------------------------

    [Fact]
    public async Task Delegate_sees_only_the_groups_they_manage()
    {
        var admin = await SeedUserAsync("a@x", "A", admin: true);
        var bob = await SeedUserAsync("b@x", "Bob");
        var mine = await Groups(admin.Id).CreateAsync(new SaveGroupDto { Name = "Mine", MemberIds = [bob.RefId], ManagerIds = [bob.RefId] });
        await Groups(admin.Id).CreateAsync(new SaveGroupDto { Name = "Other" });

        var bobList = await Groups(bob.Id).ListAsync();
        Assert.Single(bobList);
        Assert.Equal("Mine", bobList[0].Name);

        Assert.Equal(2, (await Groups(admin.Id).ListAsync()).Count);
        Assert.NotNull(await Groups(bob.Id).GetAsync(mine.Id));
        Assert.True(await Groups(bob.Id).CurrentUserManagesAnyGroupAsync());
        Assert.False(await Groups(await NewUserId("c@x")).CurrentUserManagesAnyGroupAsync());
    }

    [Fact]
    public async Task Delegate_can_edit_members_rename_and_appoint_comanagers()
    {
        var admin = await SeedUserAsync("a@x", "A", admin: true);
        var bob = await SeedUserAsync("b@x", "Bob");
        var carol = await SeedUserAsync("c@x", "Carol");
        var group = await Groups(admin.Id).CreateAsync(new SaveGroupDto { Name = "Team", MemberIds = [bob.RefId], ManagerIds = [bob.RefId] });

        await Groups(bob.Id).UpdateAsync(group.Id, new SaveGroupDto
        {
            Name = "Renamed Team",
            MemberIds = [bob.RefId, carol.RefId],
            ManagerIds = [bob.RefId, carol.RefId] // appoint Carol as co-manager
        });

        var detail = await Groups(admin.Id).GetAsync(group.Id);
        Assert.NotNull(detail);
        Assert.Equal("Renamed Team", detail!.Name);
        Assert.Equal(2, detail.Members.Count);
        Assert.Equal(2, detail.Managers.Count);
        Assert.True(await Groups(carol.Id).CurrentUserManagesAnyGroupAsync());
    }

    [Fact]
    public async Task Delegate_cannot_grant_manage_users_or_create_or_reach_other_groups()
    {
        var admin = await SeedUserAsync("a@x", "A", admin: true);
        var bob = await SeedUserAsync("b@x", "Bob");
        var team = await Groups(admin.Id).CreateAsync(new SaveGroupDto { Name = "Team", MemberIds = [bob.RefId], ManagerIds = [bob.RefId] });
        var others = await Groups(admin.Id).CreateAsync(new SaveGroupDto { Name = "Others" }); // Bob doesn't manage this

        // The manage-users flag is ignored for a delegate — the group must not gain the permission.
        await Groups(bob.Id).UpdateAsync(team.Id, new SaveGroupDto
        {
            Name = "Team", CanManageUsers = true, MemberIds = [bob.RefId], ManagerIds = [bob.RefId]
        });
        Assert.False((await Groups(admin.Id).GetAsync(team.Id))!.CanManageUsers);

        // Creating groups is full-admin-only — enforced at the controller by
        // [RequireAppPermission(ManageUsers)], so a delegate never reaches CreateAsync.
        Assert.False(await AppPerms(bob.Id).HasAsync(AppPermission.ManageUsers));

        // A group Bob doesn't manage is invisible and untouchable to him.
        Assert.DoesNotContain(await Groups(bob.Id).ListAsync(), g => g.Name == "Others");
        Assert.Null(await Groups(bob.Id).GetAsync(others.Id));
        Assert.Null(await Groups(bob.Id).UpdateAsync(others.Id, new SaveGroupDto { Name = "Others" }));
        Assert.False(await Groups(bob.Id).DeleteAsync(others.Id));
    }

    [Fact]
    public async Task Delegate_cannot_remove_self_and_managers_must_be_members()
    {
        var admin = await SeedUserAsync("a@x", "A", admin: true);
        var bob = await SeedUserAsync("b@x", "Bob");
        var carol = await SeedUserAsync("c@x", "Carol");
        var group = await Groups(admin.Id).CreateAsync(new SaveGroupDto { Name = "Team", MemberIds = [bob.RefId], ManagerIds = [bob.RefId] });

        // Bob dropping himself as manager would strand him — refused.
        await Assert.ThrowsAsync<DataValidationException>(() =>
            Groups(bob.Id).UpdateAsync(group.Id, new SaveGroupDto { Name = "Team", MemberIds = [bob.RefId], ManagerIds = [] }));

        // A manager who isn't a member is refused (even for a full admin).
        await Assert.ThrowsAsync<DataValidationException>(() =>
            Groups(admin.Id).UpdateAsync(group.Id, new SaveGroupDto { Name = "Team", MemberIds = [bob.RefId], ManagerIds = [bob.RefId, carol.RefId] }));
    }

    [Fact]
    public async Task Delegate_can_delete_their_group_and_manager_rows_cascade()
    {
        var admin = await SeedUserAsync("a@x", "A", admin: true);
        var bob = await SeedUserAsync("b@x", "Bob");
        var group = await Groups(admin.Id).CreateAsync(new SaveGroupDto { Name = "Team", MemberIds = [bob.RefId], ManagerIds = [bob.RefId] });
        var gid = await _db.UserGroups.Where(g => g.RefId == group.Id).Select(g => g.Id).FirstAsync();

        Assert.True(await Groups(bob.Id).DeleteAsync(group.Id));
        Assert.False(await _db.UserGroups.AnyAsync(g => g.Id == gid));
        Assert.False(await _db.UserGroupManagers.AnyAsync(m => m.UserGroupId == gid));
    }

    /// <summary>Seeds a plain user and returns their database id, for acting as a non-manager.</summary>
    private async Task<int> NewUserId(string email)
    {
        var u = await SeedUserAsync(email, email);
        return u.Id;
    }
}
