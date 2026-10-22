using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// Admin-area user management. <see cref="AppPermission.ManageUsers"/> is enforced once at the controller,
/// so nothing here re-checks. There's deliberately no delete: users are referenced by grants and the audit trail.
/// </summary>
public class UserAdminService
{
    private readonly ReportingDbContext _db;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly UserPermissionGrants _grants;

    public UserAdminService(ReportingDbContext db, ICurrentUserAccessor currentUserAccessor)
    {
        _db = db;
        _currentUserAccessor = currentUserAccessor;
        _grants = new UserPermissionGrants(db, currentUserAccessor);
    }

    public async Task<List<AdminUserDto>> ListAsync()
    {
        var users = await _db.Users
            .OrderBy(u => u.DisplayName)
            .Select(u => new
            {
                u.Id,
                u.RefId,
                u.DisplayName,
                u.Email,
                GroupIds = u.Memberships.Select(m => m.UserGroupId).ToList()
            })
            .ToListAsync();

        var globalAdmins = await _grants.HoldersAsync(AppPermission.GlobalAdmin);
        var canManage = await _grants.HoldersAsync(AppPermission.ManageUsers);
        var canCreateGroups = await _grants.HoldersAsync(AppPermission.CreateGroups);
        return users
            .Select(u => new AdminUserDto
            {
                Id = u.RefId,
                DisplayName = u.DisplayName,
                Email = u.Email,
                IsGlobalAdmin = globalAdmins.Contains(u.Id),
                CanManageUsers = globalAdmins.Contains(u.Id) || canManage.Contains(u.Id),
                CanCreateGroups = globalAdmins.Contains(u.Id) || canCreateGroups.Contains(u.Id),
                GroupCount = u.GroupIds.Count
            })
            .ToList();
    }

    public async Task<AdminUserDetailDto?> GetAsync(Guid refId)
    {
        var user = await _db.Users
            .Where(u => u.RefId == refId)
            .Select(u => new
            {
                u.Id,
                u.RefId,
                u.DisplayName,
                u.Email,
                u.CreatedAt,
                GroupIds = u.Memberships.Select(m => m.UserGroupId).ToList(),
                Groups = u.Memberships
                    .Select(m => new GroupRefDto { Id = m.UserGroup!.RefId, Name = m.UserGroup.Name })
                    .ToList()
            })
            .FirstOrDefaultAsync();
        if (user is null)
        {
            return null;
        }

        var isGlobalAdmin = await _grants.HoldsAsync(user.Id, AppPermission.GlobalAdmin);
        return new AdminUserDetailDto
        {
            Id = user.RefId,
            DisplayName = user.DisplayName,
            Email = user.Email,
            IsGlobalAdmin = isGlobalAdmin,
            CanManageUsers = isGlobalAdmin || await _grants.HoldsAsync(user.Id, AppPermission.ManageUsers),
            CanCreateGroups = isGlobalAdmin || await _grants.HoldsAsync(user.Id, AppPermission.CreateGroups),
            Groups = user.Groups.OrderBy(g => g.Name).ToList(),
            CreatedAt = user.CreatedAt
        };
    }

    public async Task<AdminUserDetailDto> CreateAsync(SaveUserDto dto)
    {
        var displayName = UserFields.RequireDisplayName(dto.DisplayName);
        var email = await UserFields.RequireNewEmailAsync(_db, dto.Email);

        var user = new User
        {
            RefId = Guid.NewGuid(),
            DisplayName = displayName,
            Email = email,
            CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        await UserMemberships.SetAsync(_db, user.Id, dto.GroupIds);
        await _grants.SetAsync(user.Id, AppPermission.ManageUsers, dto.CanManageUsers);
        await _grants.SetAsync(user.Id, AppPermission.CreateGroups, dto.CanCreateGroups);
        await _db.SaveChangesAsync();

        return (await GetAsync(user.RefId))!;
    }

    /// <summary>Email is the identity, so only the display name, permissions and groups are editable.</summary>
    public async Task<AdminUserDetailDto?> UpdateAsync(Guid refId, SaveUserDto dto)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.RefId == refId);
        if (user is null)
        {
            return null;
        }

        user.DisplayName = UserFields.RequireDisplayName(dto.DisplayName);

        // A global admin holds every permission implicitly, so their direct grants are left untouched.
        var isGlobalAdmin = await _grants.HoldsAsync(user.Id, AppPermission.GlobalAdmin);
        if (!isGlobalAdmin)
        {
            await UpdatePermissionsAsync(user.Id, dto);
        }

        // A global admin already reaches every group; saving an empty set clears an old membership.
        if (isGlobalAdmin && dto.GroupIds.Count > 0)
        {
            throw new DataValidationException("Global administrators already have full access to every group, so they can't be added to one.");
        }

        await UserMemberships.SetAsync(_db, user.Id, dto.GroupIds);
        await _db.SaveChangesAsync();

        return await GetAsync(refId);
    }

    private async Task UpdatePermissionsAsync(int userId, SaveUserDto dto)
    {
        // A plain user-admin removing their own manage-users access would lock themselves out.
        var actor = await _currentUserAccessor.GetAsync();
        if (userId == actor.Id && !actor.IsGlobalAdmin && !dto.CanManageUsers && await _grants.HoldsAsync(userId, AppPermission.ManageUsers))
        {
            throw new DataValidationException("You can't remove your own manage-users permission.");
        }

        await _grants.SetAsync(userId, AppPermission.ManageUsers, dto.CanManageUsers);
        await _grants.SetAsync(userId, AppPermission.CreateGroups, dto.CanCreateGroups);
    }
}
