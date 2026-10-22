using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Permissions;

/// <summary>Every user's and group's ref id and name, loaded once to label grants and audit entries.</summary>
internal sealed class SubjectDirectory
{
    private readonly Dictionary<int, (Guid RefId, string Name)> _users;
    private readonly Dictionary<int, (Guid RefId, string Name)> _groups;

    private SubjectDirectory(Dictionary<int, (Guid RefId, string Name)> users, Dictionary<int, (Guid RefId, string Name)> groups)
    {
        _users = users;
        _groups = groups;
    }

    public static async Task<SubjectDirectory> LoadAsync(ReportingDbContext db)
    {
        var users = (await db.Users.Select(u => new { u.Id, u.RefId, u.DisplayName }).ToListAsync())
            .ToDictionary(u => u.Id, u => (u.RefId, u.DisplayName));
        var groups = (await db.UserGroups.Select(g => new { g.Id, g.RefId, g.Name }).ToListAsync())
            .ToDictionary(g => g.Id, g => (g.RefId, g.Name));
        return new SubjectDirectory(users, groups);
    }

    public (Guid? Ref, string Name) Describe(GrantSubjectType type, int? id)
    {
        return type switch
        {
            GrantSubjectType.Everyone => (null, "Everyone"),
            GrantSubjectType.User when id is { } uid && _users.TryGetValue(uid, out var u) => (u.RefId, u.Name),
            GrantSubjectType.Group when id is { } gid && _groups.TryGetValue(gid, out var g) => (g.RefId, g.Name),
            _ => (null, "(unknown)")
        };
    }

    public string UserName(int userId, string fallback)
    {
        return _users.TryGetValue(userId, out var user) ? user.Name : fallback;
    }
}
