using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>Validates and writes who a group holds.</summary>
internal sealed class GroupMembership(ReportingDbContext db)
{
    /// <summary>
    /// Managers must be members, and nobody may be a global admin: their status already gives full
    /// access, so a membership would record something meaningless that outlives the flag.
    /// </summary>
    public async Task RequireValidAsync(SaveGroupDto dto)
    {
        var people = dto.MemberIds.Concat(dto.ManagerIds).ToHashSet();
        if (people.Count > 0 && await db.AppPermissionGrants.AnyAsync(g =>
                g.Permission == AppPermission.GlobalAdmin && db.Users.Any(u => u.Id == g.UserId && people.Contains(u.RefId))))
        {
            throw new DataValidationException(
                "Global administrators already have full access to every group, so they can't be added as members or managers.");
        }

        var members = dto.MemberIds.ToHashSet();
        if (!dto.ManagerIds.All(members.Contains))
        {
            throw new DataValidationException("Managers must be members of the group.");
        }
    }

    public async Task SetMembersAsync(int groupId, List<Guid> memberRefIds)
    {
        var wanted = await UserIdsAsync(memberRefIds);
        var current = await db.UserGroupMembers.Where(m => m.UserGroupId == groupId).ToListAsync();
        var currentSet = current.Select(m => m.UserId).ToHashSet();

        db.UserGroupMembers.RemoveRange(current.Where(m => !wanted.Contains(m.UserId)));
        foreach (var userId in wanted.Where(id => !currentSet.Contains(id)))
        {
            db.UserGroupMembers.Add(new UserGroupMember { UserGroupId = groupId, UserId = userId });
        }
    }

    public async Task SetManagersAsync(int groupId, List<Guid> managerRefIds)
    {
        var wanted = await UserIdsAsync(managerRefIds);
        var current = await db.UserGroupManagers.Where(m => m.UserGroupId == groupId).ToListAsync();
        var currentSet = current.Select(m => m.UserId).ToHashSet();

        db.UserGroupManagers.RemoveRange(current.Where(m => !wanted.Contains(m.UserId)));
        foreach (var userId in wanted.Where(id => !currentSet.Contains(id)))
        {
            db.UserGroupManagers.Add(new UserGroupManager { UserGroupId = groupId, UserId = userId });
        }
    }

    private async Task<HashSet<int>> UserIdsAsync(List<Guid> refIds)
    {
        if (refIds.Count == 0)
        {
            return [];
        }

        var ids = await db.Users.Where(u => refIds.Contains(u.RefId)).Select(u => u.Id).ToListAsync();
        return ids.ToHashSet();
    }
}
