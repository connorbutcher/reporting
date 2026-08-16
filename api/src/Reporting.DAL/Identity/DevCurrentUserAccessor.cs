using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Identity;

/// <summary>Plain immutable snapshot of the current user, built once per request.</summary>
public sealed record CurrentUser(
    int Id,
    Guid RefId,
    string DisplayName,
    bool IsGlobalAdmin,
    IReadOnlyCollection<int> GroupIds) : ICurrentUser;

/// <summary>
/// Stand-in accessor used until authentication is wired up: it always resolves to the
/// seeded default user (a global admin, so existing flows keep working). Real auth
/// replaces this registration with one that reads the request's claims — nothing else
/// changes. Scoped, so the lookup happens at most once per request.
/// </summary>
public class DevCurrentUserAccessor(ReportingDbContext db) : ICurrentUserAccessor
{
    private ICurrentUser? cached;

    public async Task<ICurrentUser> GetAsync()
    {
        if (cached is not null) return cached;

        var user = await db.Users
            .Where(u => u.RefId == WellKnownIds.DefaultUser)
            .Select(u => new
            {
                u.Id,
                u.RefId,
                u.DisplayName,
                u.IsGlobalAdmin,
                GroupIds = u.Memberships.Select(m => m.UserGroupId).ToList()
            })
            .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException(
                "The default user has not been seeded. Ensure DbSeeder.SeedIdentity runs at startup.");

        cached = new CurrentUser(user.Id, user.RefId, user.DisplayName, user.IsGlobalAdmin, user.GroupIds);
        return cached;
    }
}
