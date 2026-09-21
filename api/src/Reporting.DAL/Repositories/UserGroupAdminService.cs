using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// The admin-area directory operations for groups. Group management is independent of the
/// <see cref="AppPermission.ManageUsers"/> permission (which governs only the Users section):
/// access is scoped by whether the caller manages groups. A global admin sees and manages every
/// group (and creates them); everyone else is a delegated manager — a user with a
/// <see cref="UserGroupManager"/> row — who sees only the groups they manage and may edit their
/// membership, name, managers, and deletion, but can't create groups or remove themselves as a
/// manager. App permissions are never granted to a group (only to a user directly), so managing a
/// group can't escalate anyone. Groups are addressed by their RefId; all child rows cascade on delete.
/// </summary>
public class UserGroupAdminService(
    ReportingDbContext db,
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

        return groups
            .Select(g => new AdminGroupDto
            {
                Id = g.RefId,
                Name = g.Name,
                MemberCount = g.MemberCount
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

        return new AdminGroupDetailDto
        {
            Id = group.RefId,
            Name = group.Name,
            MemberCount = group.Members.Count,
            Members = group.Members.OrderBy(m => m.DisplayName).ToList(),
            Managers = group.Managers.OrderBy(m => m.DisplayName).ToList()
        };
    }

    /// <summary>
    /// Whether <paramref name="name"/> is free to use for a group, ignoring <paramref name="excludeId"/> (the
    /// group being edited, if any). Checked against every group regardless of the caller's manage scope — a
    /// delegated manager doesn't see every group's name, so the client can't reliably judge uniqueness on its
    /// own — but still requires the caller to have some group-management access to call it at all.
    /// </summary>
    public async Task<bool> NameAvailableAsync(string? name, Guid? excludeId)
    {
        var (full, scope) = await ScopeAsync();
        if (!full && scope.Count == 0)
            throw new AccessDeniedException("You don't have access to group administration.");

        var trimmed = (name ?? string.Empty).Trim();
        if (trimmed.Length == 0) return true;

        return !await db.UserGroups.AnyAsync(g => g.Name == trimmed && (excludeId == null || g.RefId != excludeId));
    }

    public async Task<AdminGroupDetailDto> CreateAsync(SaveGroupDto dto)
    {
        // Creating groups is reserved for a full admin (a global admin). Delegated managers only ever
        // manage existing groups, so a new group is a bootstrap the top-level admin performs.
        var (full, _) = await ScopeAsync();
        if (!full) throw new AccessDeniedException("Only an administrator can create groups.");

        var name = (dto.Name ?? string.Empty).Trim();
        if (name.Length == 0) throw new DataValidationException("A group name is required.");
        if (await db.UserGroups.AnyAsync(g => g.Name == name))
            throw new DataValidationException($"A group called \"{name}\" already exists.");
        await RequireValidMembershipAsync(dto);

        var group = new UserGroup { RefId = Guid.NewGuid(), Name = name };
        db.UserGroups.Add(group);
        await db.SaveChangesAsync();

        await SetMembersAsync(group.Id, dto.MemberIds);
        await SetManagersAsync(group.Id, dto.ManagerIds);
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
        await RequireValidMembershipAsync(dto);

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
        await db.SaveChangesAsync();

        return await GetAsync(refId);
    }

    public async Task<bool> DeleteAsync(Guid refId)
    {
        var (full, scope) = await ScopeAsync();

        var group = await db.UserGroups.FirstOrDefaultAsync(g => g.RefId == refId);
        if (group is null) return false;
        if (!full && !scope.Contains(group.Id)) return false; // hidden

        // Membership, manager, and ACL-grant rows all cascade from the group.
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
    /// The current user's group-management reach: a global admin manages every group; everyone else
    /// manages only the groups they hold a manager row for. The <see cref="AppPermission.ManageUsers"/>
    /// permission grants no group access — only global-admin status or a manager row does.
    /// </summary>
    private async Task<(bool FullAdmin, HashSet<int> ManagedGroupIds)> ScopeAsync()
    {
        var actor = await currentUserAccessor.GetAsync();
        if (actor.IsGlobalAdmin)
            return (true, new HashSet<int>());

        var managed = await db.UserGroupManagers
            .Where(m => m.UserId == actor.Id)
            .Select(m => m.UserGroupId)
            .ToListAsync();
        return (false, managed.ToHashSet());
    }

    // --- helpers ----------------------------------------------------------

    /// <summary>
    /// Who a group may hold: managers must be members, and nobody may be a global admin. A global
    /// admin already has full access to every group by that status alone, so a membership or a
    /// delegation for one would record something that means nothing (and would outlive the flag if
    /// it were ever lifted).
    /// </summary>
    private async Task RequireValidMembershipAsync(SaveGroupDto dto)
    {
        var people = dto.MemberIds.Concat(dto.ManagerIds).ToHashSet();
        if (people.Count > 0 && await db.Users.AnyAsync(u => people.Contains(u.RefId) && u.IsGlobalAdmin))
        {
            throw new DataValidationException(
                "Global administrators already have full access to every group, so they can't be added as members or managers.");
        }

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

}
