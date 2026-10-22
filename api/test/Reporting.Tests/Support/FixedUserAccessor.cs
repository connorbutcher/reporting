using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Identity;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>Acts as the given user with no group memberships.</summary>
public sealed class FixedUserAccessor(ReportingDbContext db, int userId) : ICurrentUserAccessor
{
    public async Task<ICurrentUser> GetAsync()
    {
        var u = await db.Users.Where(x => x.Id == userId).FirstAsync();
        var isGlobalAdmin = await db.AppPermissionGrants.AnyAsync(g => g.UserId == userId && g.Permission == AppPermission.GlobalAdmin);
        return new CurrentUser(u.Id, u.RefId, u.DisplayName, u.Email, isGlobalAdmin, []);
    }
}
