using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>The ManageUsers permission grants no group access: only global-admin status or a manager row does.</summary>
internal sealed class GroupScopeLoader(ReportingDbContext db, ICurrentUserAccessor currentUserAccessor)
{
    public async Task<GroupScope> LoadAsync()
    {
        var actor = await currentUserAccessor.GetAsync();
        if (actor.IsGlobalAdmin)
        {
            return new GroupScope(true, new HashSet<int>());
        }

        var managed = await db.UserGroupManagers
            .Where(m => m.UserId == actor.Id)
            .Select(m => m.UserGroupId)
            .ToListAsync();
        return new GroupScope(false, managed.ToHashSet());
    }
}
