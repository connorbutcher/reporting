using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Permissions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// The admin-area directory operations for groups. Access is scoped: a full admin (the
/// <see cref="AppPermission.ManageUsers"/> permission, or global admin) sees and manages every
/// group, while a delegated manager — a user with a <see cref="UserGroupManager"/> row — sees only
/// the groups they manage and may edit their membership, name, managers, and deletion. A delegated
/// manager can never grant the ManageUsers permission, create groups, or manage a group that itself
/// holds ManageUsers (that would escalate its members to full admin), and can't remove themselves as
/// a manager. Groups are addressed by their RefId; all child rows cascade on delete.
/// </summary>
public class UserGroupAdminService(
    ReportingDbContext db,
    AppPermissionService appPermissions,
    ICurrentUserAccessor currentUserAccessor)
{
    public async Task<List<AdminGroupDto>> ListAsync()
    {
        var (full, scope) = await ScopeAsync();
        if (!full && scope.Count == 0)
            throw new AccessDeniedException("You don't have access to group administration.");

        var query = full ? db.UserGroups : db.UserGroups.Where(g => scope.Contains(g.Id));
        var groups = await query
            .OrderBy(g => g.Name)
            .Select(g => new { g.Id, g.RefId, g.Name, MemberCount = g.Members.Count })
            .ToListAsync();

        var adminGroups = await ManageUsersGroupIdsAsync();
        return groups
            .Select(g => new AdminGroupDto
            {
                Id = g.RefId,
                Name = g.Name,
                MemberCount = g.MemberCount,
                CanManageUsers = adminGroups.Contains(g.Id)
            })
            .ToList();
    }

    public async Task<AdminGroupDetailDto?> GetAsync(Guid refId)
    {
        var (full, scope) = await ScopeAsync();

        var group = await db.UserGroups
            .Where(g => g.RefId == refId)
            .Select(g => new
            {
                g.Id,
                g.RefId,
                g.Name,
                Members = g.Members
                    .Select(m => new UserRefDto { Id = m.User!.RefId, DisplayName = m.User.DisplayName, Email = m.User.Email })
                    .ToList(),
                Managers = g.Managers
                    .Select(m => new UserRefDto { Id = m.User!.RefId, DisplayName = m.User.DisplayName, Email = m.User.Email })
                    .ToList()
            })
            .FirstOrDefaultAsync();
        if (group is null) return null;
        if (!full && !scope.Contains(group.Id)) return null; // hidden from a delegate who can't manage it

        var adminGroups = await ManageUsersGroupIdsAsync();
        return new AdminGroupDetailDto
        {
            Id = group.RefId,
            Name = group.Name,
            MemberCount = group.Members.Count,
            CanManageUsers = adminGroups.Contains(group.Id),
            Members = group.Members.OrderBy(m => m.DisplayName).ToList(),
            Managers = group.Managers.OrderBy(m => m.DisplayName).ToList()
        };
    }

    public async Task<AdminGroupDetailDto> CreateAsync(SaveGroupDto dto)
    {
        // Creating groups is a full-admin action; delegation is only over existing groups.
        await appPermissions.RequireAsync(AppPermission.ManageUsers);

        var name = (dto.Name ?? string.Empty).Trim();
        if (name.Length == 0) throw new DataValidationException("A group name is required.");
        if (await db.UserGroups.AnyAsync(g => g.Name == name))
            throw new DataValidationException($"A group called \"{name}\" already exists.");
        RequireManagersAreMembers(dto);

        var group = new UserGroup { RefId = Guid.NewGuid(), Name = name };
        db.UserGroups.Add(group);
        await db.SaveChangesAsync();

        await SetMembersAsync(group.Id, dto.MemberIds);
        await SetManagersAsync(group.Id, dto.ManagerIds);
        await SetManageUsersAsync(group.Id, dto.CanManageUsers);
        await db.SaveChangesAsync();

        return (await GetAsync(group.RefId))!;
    }

    public async Task<AdminGroupDetailDto?> UpdateAsync(Guid refId, SaveGroupDto dto)
    {
        var (full, scope) = await ScopeAsync();

        var group = await db.UserGroups.FirstOrDefaultAsync(g => g.RefId == refId);
        if (group is null) return null;
        if (!full && !scope.Contains(group.Id)) return null; // hidden

        var name = (dto.Name ?? string.Empty).Trim();
        if (name.Length == 0) throw new DataValidationException("A group name is required.");
        if (await db.UserGroups.AnyAsync(g => g.Name == name && g.Id != group.Id))
            throw new DataValidationException($"A group called \"{name}\" already exists.");
        RequireManagersAreMembers(dto);

        // A delegated manager can't drop themselves and lose access to the group mid-edit.
        if (!full)
        {
            var actor = await currentUserAccessor.GetAsync();
            if (!dto.ManagerIds.Contains(actor.RefId))
                throw new DataValidationException("You can't remove yourself as a manager of this group.");
        }

        group.Name = name;
        await SetMembersAsync(group.Id, dto.MemberIds);
        await SetManagersAsync(group.Id, dto.ManagerIds);
        // Only full admins can grant/revoke the ManageUsers permission; a delegate's flag is ignored.
        if (full) await SetManageUsersAsync(group.Id, dto.CanManageUsers);
        await db.SaveChangesAsync();

        return await GetAsync(refId);
    }

    public async Task<bool> DeleteAsync(Guid refId)
    {
        var (full, scope) = await ScopeAsync();

        var group = await db.UserGroups.FirstOrDefaultAsync(g => g.RefId == refId);
        if (group is null) return false;
        if (!full && !scope.Contains(group.Id)) return false; // hidden

        // Membership, manager, ACL-grant and app-permission-grant rows all cascade from the group.
        db.UserGroups.Remove(group);
        await db.SaveChangesAsync();
        return true;
    }

    /// <summary>Whether the current user can reach the Groups section — a full admin, or a delegate of at least one group.</summary>
    public async Task<bool> CurrentUserManagesAnyGroupAsync()
    {
        var (full, scope) = await ScopeAsync();
        return full || scope.Count > 0;
    }

    // --- scope ------------------------------------------------------------

    /// <summary>
    /// The current user's group-management reach: full admins manage everything; otherwise the
    /// groups they hold a manager row for, excluding any that themselves grant ManageUsers (those
    /// stay full-admin-only, so a delegate can't add members to escalate them to full admin).
    /// </summary>
    private async Task<(bool FullAdmin, HashSet<int> ManagedGroupIds)> ScopeAsync()
    {
        if (await appPermissions.HasAsync(AppPermission.ManageUsers))
            return (true, new HashSet<int>());

        var actor = await currentUserAccessor.GetAsync();
        var managed = await db.UserGroupManagers
            .Where(m => m.UserId == actor.Id)
            .Select(m => m.UserGroupId)
            .ToListAsync();
        var adminGroups = await ManageUsersGroupIdsAsync();
        return (false, managed.Where(id => !adminGroups.Contains(id)).ToHashSet());
    }

    // --- helpers ----------------------------------------------------------

    private static void RequireManagersAreMembers(SaveGroupDto dto)
    {
        var members = dto.MemberIds.ToHashSet();
        if (!dto.ManagerIds.All(members.Contains))
            throw new DataValidationException("Managers must be members of the group.");
    }

    /// <summary>Resolves the given user RefIds to database ids and sets the group's members to exactly that set.</summary>
    private async Task SetMembersAsync(int groupId, List<Guid> memberRefIds)
    {
        var wanted = memberRefIds.Count == 0
            ? new List<int>()
            : await db.Users.Where(u => memberRefIds.Contains(u.RefId)).Select(u => u.Id).ToListAsync();
        var wantedSet = wanted.ToHashSet();

        var current = await db.UserGroupMembers.Where(m => m.UserGroupId == groupId).ToListAsync();
        var currentSet = current.Select(m => m.UserId).ToHashSet();

        db.UserGroupMembers.RemoveRange(current.Where(m => !wantedSet.Contains(m.UserId)));
        foreach (var userId in wantedSet.Where(id => !currentSet.Contains(id)))
            db.UserGroupMembers.Add(new UserGroupMember { UserGroupId = groupId, UserId = userId });
    }

    /// <summary>Resolves the given user RefIds to database ids and sets the group's managers to exactly that set.</summary>
    private async Task SetManagersAsync(int groupId, List<Guid> managerRefIds)
    {
        var wanted = managerRefIds.Count == 0
            ? new List<int>()
            : await db.Users.Where(u => managerRefIds.Contains(u.RefId)).Select(u => u.Id).ToListAsync();
        var wantedSet = wanted.ToHashSet();

        var current = await db.UserGroupManagers.Where(m => m.UserGroupId == groupId).ToListAsync();
        var currentSet = current.Select(m => m.UserId).ToHashSet();

        db.UserGroupManagers.RemoveRange(current.Where(m => !wantedSet.Contains(m.UserId)));
        foreach (var userId in wantedSet.Where(id => !currentSet.Contains(id)))
            db.UserGroupManagers.Add(new UserGroupManager { UserGroupId = groupId, UserId = userId });
    }

    /// <summary>Adds or removes the group's ManageUsers grant to match <paramref name="canManage"/>.</summary>
    private async Task SetManageUsersAsync(int groupId, bool canManage)
    {
        var existing = await db.AppPermissionGrants.FirstOrDefaultAsync(g =>
            g.Permission == AppPermission.ManageUsers
            && g.SubjectType == GrantSubjectType.Group && g.UserGroupId == groupId);

        if (canManage && existing is null)
        {
            var actor = await currentUserAccessor.GetAsync();
            db.AppPermissionGrants.Add(new AppPermissionGrant
            {
                Permission = AppPermission.ManageUsers,
                SubjectType = GrantSubjectType.Group,
                UserGroupId = groupId,
                CreatedAt = DateTime.UtcNow,
                CreatedByUserId = actor.Id
            });
        }
        else if (!canManage && existing is not null)
        {
            db.AppPermissionGrants.Remove(existing);
        }
    }

    /// <summary>The ids of groups that hold the ManageUsers permission (their members become full admins).</summary>
    private async Task<HashSet<int>> ManageUsersGroupIdsAsync() =>
        (await db.AppPermissionGrants
            .Where(g => g.Permission == AppPermission.ManageUsers && g.SubjectType == GrantSubjectType.Group && g.UserGroupId != null)
            .Select(g => g.UserGroupId!.Value)
            .ToListAsync())
        .ToHashSet();
}
