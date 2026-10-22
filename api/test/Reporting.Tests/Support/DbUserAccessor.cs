using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Identity;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>Acts as the given user, with their global-admin flag and group memberships read from the database.</summary>
public sealed class DbUserAccessor(ReportingDbContext db, int userId) : ICurrentUserAccessor
{
    public async Task<ICurrentUser> GetAsync()
    {
        var u = await db.Users
            .Where(x => x.Id == userId)
            .Select(x => new
            {
                x.Id,
                x.RefId,
                x.DisplayName,
                x.Email,
                IsGlobalAdmin = db.AppPermissionGrants.Any(g => g.UserId == x.Id && g.Permission == AppPermission.GlobalAdmin),
                GroupIds = x.Memberships.Select(m => m.UserGroupId).ToList()
            })
            .FirstAsync();
        return new CurrentUser(u.Id, u.RefId, u.DisplayName, u.Email, u.IsGlobalAdmin, u.GroupIds);
    }
}
