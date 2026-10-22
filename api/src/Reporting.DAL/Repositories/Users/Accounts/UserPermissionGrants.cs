using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>A user's direct app-permission grants.</summary>
internal sealed class UserPermissionGrants(ReportingDbContext db, ICurrentUserAccessor currentUserAccessor)
{
    /// <summary>Adds or removes the grant to match <paramref name="grant"/>.</summary>
    public async Task SetAsync(int userId, AppPermission permission, bool grant)
    {
        var existing = await db.AppPermissionGrants.FirstOrDefaultAsync(g =>
            g.Permission == permission && g.UserId == userId);

        if (grant && existing is null)
        {
            var actor = await currentUserAccessor.GetAsync();
            db.AppPermissionGrants.Add(new AppPermissionGrant
            {
                Permission = permission,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                CreatedByUserId = actor.Id
            });
        }
        else if (!grant && existing is not null)
        {
            db.AppPermissionGrants.Remove(existing);
        }
    }

    /// <summary>Every holder at once, so a list resolves each user's flag in memory.</summary>
    public async Task<HashSet<int>> HoldersAsync(AppPermission permission)
    {
        var ids = await db.AppPermissionGrants
            .Where(g => g.Permission == permission)
            .Select(g => g.UserId)
            .ToListAsync();
        return ids.ToHashSet();
    }

    public Task<bool> HoldsAsync(int userId, AppPermission permission)
    {
        return db.AppPermissionGrants.AnyAsync(g => g.Permission == permission && g.UserId == userId);
    }
}
