using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

internal static class GroupDetailQuery
{
    public static async Task<List<AdminGroupDto>> ListAsync(IQueryable<UserGroup> groups)
    {
        var rows = await groups
            .OrderBy(g => g.Name)
            .Select(g => new { g.Id, g.RefId, g.Name, MemberCount = g.Members.Count })
            .ToListAsync();

        return rows
            .Select(g => new AdminGroupDto
            {
                Id = g.RefId,
                Name = g.Name,
                MemberCount = g.MemberCount
            })
            .ToList();
    }

    /// <summary>Null when the group doesn't exist or <paramref name="scope"/> doesn't reach it.</summary>
    public static async Task<AdminGroupDetailDto?> GetAsync(ReportingDbContext db, Guid refId, GroupScope scope)
    {
        var group = await db.UserGroups
            .Where(g => g.RefId == refId)
            .Select(g => new
            {
                g.Id,
                g.RefId,
                g.Name,
                Members = g.Members
                    .Select(m => new UserRefDto { Id = m.User!.RefId, DisplayName = m.User.DisplayName, Email = m.User.Email })
                    .ToList(),
                Managers = g.Managers
                    .Select(m => new UserRefDto { Id = m.User!.RefId, DisplayName = m.User.DisplayName, Email = m.User.Email })
                    .ToList()
            })
            .FirstOrDefaultAsync();
        if (group is null || !scope.Manages(group.Id))
        {
            return null;
        }

        return new AdminGroupDetailDto
        {
            Id = group.RefId,
            Name = group.Name,
            MemberCount = group.Members.Count,
            Members = group.Members.OrderBy(m => m.DisplayName).ToList(),
            Managers = group.Managers.OrderBy(m => m.DisplayName).ToList()
        };
    }
}
