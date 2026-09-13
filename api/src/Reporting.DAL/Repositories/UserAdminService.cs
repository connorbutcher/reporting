using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// The admin-area directory operations for users: list, view, create, and edit. The whole area
/// requires the <see cref="AppPermission.ManageUsers"/> permission, enforced once at the controller
/// by <c>[RequireAppPermission(ManageUsers)]</c> (a user who lacks it gets a 403 before reaching
/// here), so these methods don't re-check. Users are addressed by their RefId. There is deliberately
/// no delete — users are referenced by grants and the audit trail, so the scope is view/create/edit only.
/// </summary>
public partial class UserAdminService(
    ReportingDbContext db,
    ICurrentUserAccessor currentUserAccessor)
{
    public async Task<List<AdminUserDto>> ListAsync()
    {
        var users = await db.Users
            .OrderBy(u => u.DisplayName)
            .Select(u => new
            {
                u.Id,
                u.RefId,
                u.DisplayName,
                u.Email,
                u.IsGlobalAdmin,
                GroupIds = u.Memberships.Select(m => m.UserGroupId).ToList()
            })
            .ToListAsync();

        var canManage = await ManageUsersUserIdsAsync();
        return users
            .Select(u => new AdminUserDto
            {
                Id = u.RefId,
                DisplayName = u.DisplayName,
                Email = u.Email,
                IsGlobalAdmin = u.IsGlobalAdmin,
                CanManageUsers = u.IsGlobalAdmin || canManage.Contains(u.Id),
                GroupCount = u.GroupIds.Count
            })
            .ToList();
    }

    public async Task<AdminUserDetailDto?> GetAsync(Guid refId)
    {
        var user = await db.Users
            .Where(u => u.RefId == refId)
            .Select(u => new
            {
                u.Id,
                u.RefId,
                u.DisplayName,
                u.Email,
                u.IsGlobalAdmin,
                u.CreatedAt,
                GroupIds = u.Memberships.Select(m => m.UserGroupId).ToList(),
                Groups = u.Memberships
                    .Select(m => new GroupRefDto { Id = m.UserGroup!.RefId, Name = m.UserGroup.Name })
                    .ToList()
            })
            .FirstOrDefaultAsync();
        if (user is null) return null;

        var canManage = await ManageUsersUserIdsAsync();
        return new AdminUserDetailDto
        {
            Id = user.RefId,
            DisplayName = user.DisplayName,
            Email = user.Email,
            IsGlobalAdmin = user.IsGlobalAdmin,
            CanManageUsers = user.IsGlobalAdmin || canManage.Contains(user.Id),
            Groups = user.Groups.OrderBy(g => g.Name).ToList(),
            CreatedAt = user.CreatedAt
        };
    }

    public async Task<AdminUserDetailDto> CreateAsync(SaveUserDto dto)
    {
        var displayName = (dto.DisplayName ?? string.Empty).Trim();
        var email = (dto.Email ?? string.Empty).Trim();
        if (displayName.Length == 0) throw new DataValidationException("A display name is required.");
        if (!IsValidEmail(email)) throw new DataValidationException("A valid email is required.");
        if (await db.Users.AnyAsync(u => u.Email == email))
            throw new DataValidationException($"A user with the email \"{email}\" already exists.");

        var user = new User
        {
            RefId = Guid.NewGuid(),
            DisplayName = displayName,
            Email = email,
            CreatedAt = DateTime.UtcNow
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        await SetMembershipsAsync(user.Id, dto.GroupIds);
        await SetManageUsersAsync(user.Id, dto.CanManageUsers);
        await db.SaveChangesAsync();

        return (await GetAsync(user.RefId))!;
    }

    public async Task<AdminUserDetailDto?> UpdateAsync(Guid refId, SaveUserDto dto)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.RefId == refId);
        if (user is null) return null;

        var displayName = (dto.DisplayName ?? string.Empty).Trim();
        if (displayName.Length == 0) throw new DataValidationException("A display name is required.");

        // Email is the identity and immutable here; only the display name is editable.
        user.DisplayName = displayName;

        // Global admins already hold every permission implicitly, so the direct grant is a no-op
        // for them; leave it untouched to avoid a confusing "revoked but still can" state.
        if (!user.IsGlobalAdmin)
        {
            var actor = await currentUserAccessor.GetAsync();
            // Don't let an admin strip their own manage-users access out from under themselves —
            // a global admin can always restore it, but a plain user-admin would lock themselves out.
            if (user.Id == actor.Id && !actor.IsGlobalAdmin && !dto.CanManageUsers && await HasDirectManageUsersAsync(user.Id))
                throw new DataValidationException("You can't remove your own manage-users permission.");

            await SetManageUsersAsync(user.Id, dto.CanManageUsers);
        }

        await SetMembershipsAsync(user.Id, dto.GroupIds);
        await db.SaveChangesAsync();

        return await GetAsync(refId);
    }

    // --- helpers ----------------------------------------------------------

    /// <summary>Resolves the given group RefIds to database ids and sets the user's memberships to exactly that set.</summary>
    private async Task SetMembershipsAsync(int userId, List<Guid> groupRefIds)
    {
        var wanted = groupRefIds.Count == 0
            ? new List<int>()
            : await db.UserGroups.Where(g => groupRefIds.Contains(g.RefId)).Select(g => g.Id).ToListAsync();
        var wantedSet = wanted.ToHashSet();

        var current = await db.UserGroupMembers.Where(m => m.UserId == userId).ToListAsync();
        var currentSet = current.Select(m => m.UserGroupId).ToHashSet();

        db.UserGroupMembers.RemoveRange(current.Where(m => !wantedSet.Contains(m.UserGroupId)));
        foreach (var groupId in wantedSet.Where(id => !currentSet.Contains(id)))
            db.UserGroupMembers.Add(new UserGroupMember { UserId = userId, UserGroupId = groupId });
    }

    /// <summary>Adds or removes the user's ManageUsers grant to match <paramref name="canManage"/>.</summary>
    private async Task SetManageUsersAsync(int userId, bool canManage)
    {
        var existing = await db.AppPermissionGrants.FirstOrDefaultAsync(g =>
            g.Permission == AppPermission.ManageUsers && g.UserId == userId);

        if (canManage && existing is null)
        {
            var actor = await currentUserAccessor.GetAsync();
            db.AppPermissionGrants.Add(new AppPermissionGrant
            {
                Permission = AppPermission.ManageUsers,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                CreatedByUserId = actor.Id
            });
        }
        else if (!canManage && existing is not null)
        {
            db.AppPermissionGrants.Remove(existing);
        }
    }

    /// <summary>The ids of every user holding a ManageUsers grant, so a list resolves each user's flag in memory.</summary>
    private async Task<HashSet<int>> ManageUsersUserIdsAsync() =>
        (await db.AppPermissionGrants
            .Where(g => g.Permission == AppPermission.ManageUsers)
            .Select(g => g.UserId)
            .ToListAsync())
        .ToHashSet();

    /// <summary>Whether the given user holds a ManageUsers grant.</summary>
    private Task<bool> HasDirectManageUsersAsync(int userId) =>
        db.AppPermissionGrants.AnyAsync(g => g.Permission == AppPermission.ManageUsers && g.UserId == userId);

    private static bool IsValidEmail(string email) => email.Length > 0 && EmailPattern().IsMatch(email);

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
    private static partial Regex EmailPattern();
}
