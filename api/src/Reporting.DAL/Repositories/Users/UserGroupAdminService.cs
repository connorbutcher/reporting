using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Permissions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// Admin-area group management, independent of <see cref="AppPermission.ManageUsers"/>. A global admin
/// manages every group; a delegated manager only the groups they manage, and can't remove themselves as
/// a manager. Creating needs <see cref="AppPermission.CreateGroups"/>, and the creator becomes a manager.
/// App permissions are never granted to a group, so managing one can't escalate anyone.
/// </summary>
public class UserGroupAdminService
{
    private readonly ReportingDbContext _db;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly AppPermissionService _appPermissions;
    private readonly GroupScopeLoader _scopes;
    private readonly GroupMembership _membership;

    public UserGroupAdminService(
        ReportingDbContext db,
        ICurrentUserAccessor currentUserAccessor,
        AppPermissionService appPermissions)
    {
        _db = db;
        _currentUserAccessor = currentUserAccessor;
        _appPermissions = appPermissions;
        _scopes = new GroupScopeLoader(db, currentUserAccessor);
        _membership = new GroupMembership(db);
    }

    public async Task<List<AdminGroupDto>> ListAsync()
    {
        var scope = await RequireAnyAccessAsync();
        var query = scope.FullAdmin ? _db.UserGroups : _db.UserGroups.Where(g => scope.ManagedGroupIds.Contains(g.Id));
        return await GroupDetailQuery.ListAsync(query);
    }

    public async Task<AdminGroupDetailDto?> GetAsync(Guid refId)
    {
        var scope = await _scopes.LoadAsync();
        return await GroupDetailQuery.GetAsync(_db, refId, scope);
    }

    /// <summary>
    /// Checked against every group regardless of scope, since a delegate can't see every name, but the
    /// caller still needs some group-management access.
    /// </summary>
    public async Task<bool> NameAvailableAsync(string? name, Guid? excludeId)
    {
        await RequireAnyAccessAsync();

        var trimmed = (name ?? string.Empty).Trim();
        if (trimmed.Length == 0)
        {
            return true;
        }

        return !await _db.UserGroups.AnyAsync(g => g.Name == trimmed && (excludeId == null || g.RefId != excludeId));
    }

    public async Task<AdminGroupDetailDto> CreateAsync(SaveGroupDto dto)
    {
        if (!await CanCreateGroupsAsync())
        {
            throw new AccessDeniedException("You don't have permission to create groups.");
        }

        var name = await GroupNames.RequireAvailableAsync(_db, dto.Name, null);
        await _membership.RequireValidAsync(dto);

        var group = new UserGroup { RefId = Guid.NewGuid(), Name = name };
        _db.UserGroups.Add(group);
        await _db.SaveChangesAsync();

        var (memberIds, managerIds) = await WithCreatorAsync(dto);
        await _membership.SetMembersAsync(group.Id, memberIds);
        await _membership.SetManagersAsync(group.Id, managerIds);
        await _db.SaveChangesAsync();

        return (await GetAsync(group.RefId))!;
    }

    public async Task<AdminGroupDetailDto?> UpdateAsync(Guid refId, SaveGroupDto dto)
    {
        var scope = await _scopes.LoadAsync();
        var group = await _db.UserGroups.FirstOrDefaultAsync(g => g.RefId == refId);
        if (group is null || !scope.Manages(group.Id))
        {
            return null;
        }

        var name = await GroupNames.RequireAvailableAsync(_db, dto.Name, group.Id);
        await _membership.RequireValidAsync(dto);
        if (!scope.FullAdmin)
        {
            await RequireStaysManagerAsync(dto);
        }

        group.Name = name;
        await _membership.SetMembersAsync(group.Id, dto.MemberIds);
        await _membership.SetManagersAsync(group.Id, dto.ManagerIds);
        await _db.SaveChangesAsync();

        return await GetAsync(refId);
    }

    /// <summary>Membership, manager and ACL-grant rows all cascade from the group.</summary>
    public async Task<bool> DeleteAsync(Guid refId)
    {
        var scope = await _scopes.LoadAsync();
        var group = await _db.UserGroups.FirstOrDefaultAsync(g => g.RefId == refId);
        if (group is null || !scope.Manages(group.Id))
        {
            return false;
        }

        _db.UserGroups.Remove(group);
        await _db.SaveChangesAsync();
        return true;
    }

    /// <summary>A holder of <see cref="AppPermission.CreateGroups"/> reaches the section even before managing any group.</summary>
    public async Task<bool> CurrentUserManagesAnyGroupAsync()
    {
        var scope = await _scopes.LoadAsync();
        return scope.ManagesAny || await CanCreateGroupsAsync();
    }

    /// <summary>Implied for a global admin, who holds every app permission.</summary>
    private Task<bool> CanCreateGroupsAsync()
    {
        return _appPermissions.HasAsync(AppPermission.CreateGroups);
    }

    private async Task<GroupScope> RequireAnyAccessAsync()
    {
        var scope = await _scopes.LoadAsync();
        if (!scope.ManagesAny && !await CanCreateGroupsAsync())
        {
            throw new AccessDeniedException("You don't have access to group administration.");
        }

        return scope;
    }

    /// <summary>A delegated manager can't drop themselves and lose access mid-edit.</summary>
    private async Task RequireStaysManagerAsync(SaveGroupDto dto)
    {
        var actor = await _currentUserAccessor.GetAsync();
        if (!dto.ManagerIds.Contains(actor.RefId))
        {
            throw new DataValidationException("You can't remove yourself as a manager of this group.");
        }
    }

    /// <summary>The creator manages what they made, unless they're a global admin, whose access is already implied.</summary>
    private async Task<(List<Guid> MemberIds, List<Guid> ManagerIds)> WithCreatorAsync(SaveGroupDto dto)
    {
        var actor = await _currentUserAccessor.GetAsync();
        var memberIds = dto.MemberIds;
        var managerIds = dto.ManagerIds;
        if (actor.IsGlobalAdmin)
        {
            return (memberIds, managerIds);
        }

        if (!memberIds.Contains(actor.RefId))
        {
            memberIds = [.. memberIds, actor.RefId];
        }

        if (!managerIds.Contains(actor.RefId))
        {
            managerIds = [.. managerIds, actor.RefId];
        }

        return (memberIds, managerIds);
    }
}
