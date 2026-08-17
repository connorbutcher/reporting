using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>Read access to users and groups, for the permission editor's subject pickers.</summary>
public class UserRepository(ReportingDbContext db)
{
    public async Task<List<UserDto>> GetUsersAsync() =>
        await db.Users
            .OrderBy(u => u.DisplayName)
            .Select(u => new UserDto
            {
                Id = u.RefId,
                DisplayName = u.DisplayName,
                Email = u.Email,
                IsGlobalAdmin = u.IsGlobalAdmin
            })
            .ToListAsync();

    public async Task<List<UserGroupDto>> GetGroupsAsync() =>
        await db.UserGroups
            .OrderBy(g => g.Name)
            .Select(g => new UserGroupDto
            {
                Id = g.RefId,
                Name = g.Name,
                MemberCount = g.Members.Count
            })
            .ToListAsync();
}
