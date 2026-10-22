using Microsoft.EntityFrameworkCore;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

internal static class UserMemberships
{
    /// <summary>Sets the user's memberships to exactly the given groups.</summary>
    public static async Task SetAsync(ReportingDbContext db, int userId, List<Guid> groupRefIds)
    {
        var wanted = groupRefIds.Count == 0
            ? new List<int>()
            : await db.UserGroups.Where(g => groupRefIds.Contains(g.RefId)).Select(g => g.Id).ToListAsync();
        var wantedSet = wanted.ToHashSet();

        var current = await db.UserGroupMembers.Where(m => m.UserId == userId).ToListAsync();
        var currentSet = current.Select(m => m.UserGroupId).ToHashSet();

        db.UserGroupMembers.RemoveRange(current.Where(m => !wantedSet.Contains(m.UserGroupId)));
        foreach (var groupId in wantedSet.Where(id => !currentSet.Contains(id)))
        {
            db.UserGroupMembers.Add(new UserGroupMember { UserId = userId, UserGroupId = groupId });
        }
    }
}
