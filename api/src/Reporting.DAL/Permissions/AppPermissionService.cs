using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Permissions;

/// <summary>
/// Resolves and enforces the current user's application-wide permissions (see
/// <see cref="AppPermission"/>), which sit alongside the folder/report ACL rather than on any
/// securable. Mirrors <see cref="PermissionService"/>: only the grants that can match this user —
/// their own and their groups' — are loaded, once per request, and global admins short-circuit to
/// "holds everything" before anything is loaded. Scoped.
/// </summary>
public class AppPermissionService(ReportingDbContext db, ICurrentUserAccessor currentUserAccessor)
{
    private HashSet<AppPermission>? cached;

    public async Task<bool> HasAsync(AppPermission permission) =>
        (await LoadAsync()).Contains(permission);

    /// <summary>Throws <see cref="AccessDeniedException"/> (→ 403) when the current user lacks the permission.</summary>
    public async Task RequireAsync(AppPermission permission)
    {
        if (!await HasAsync(permission))
            throw new AccessDeniedException("This action requires the manage-users permission.");
    }

    public async Task<IReadOnlyCollection<AppPermission>> ForCurrentUserAsync() =>
        (await LoadAsync()).ToList();

    private async Task<HashSet<AppPermission>> LoadAsync()
    {
        if (cached is not null) return cached;

        var user = await currentUserAccessor.GetAsync();
        // A global admin holds every app permission, so there's nothing to load.
        if (user.IsGlobalAdmin) return cached = new HashSet<AppPermission>(Enum.GetValues<AppPermission>());

        var groupIds = user.GroupIds.ToList();
        var permissions = await db.AppPermissionGrants
            .Where(g => (g.SubjectType == GrantSubjectType.User && g.UserId == user.Id)
                || (g.SubjectType == GrantSubjectType.Group && g.UserGroupId != null && groupIds.Contains(g.UserGroupId.Value)))
            .Select(g => g.Permission)
            .ToListAsync();

        return cached = permissions.ToHashSet();
    }
}
