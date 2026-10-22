using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Permissions;

/// <summary>Maps between (type, id) pairs and an <see cref="AccessGrant"/>'s typed foreign keys.</summary>
internal static class GrantKeys
{
    public static (int? FolderId, int? ReportId) SecurableIds(SecurableType type, int? id)
    {
        return type switch
        {
            SecurableType.Folder => (id, null),
            SecurableType.Report => (null, id),
            _ => (null, null)
        };
    }

    public static (int? UserId, int? UserGroupId) SubjectIds(GrantSubjectType type, int? id)
    {
        return type switch
        {
            GrantSubjectType.User => (id, null),
            GrantSubjectType.Group => (null, id),
            _ => (null, null)
        };
    }

    public static async Task<List<SecurableGrant>> LoadAsync(IQueryable<AccessGrant> grants)
    {
        var rows = await grants
            .Select(g => new { g.SecurableType, g.FolderId, g.ReportId, g.SubjectType, g.UserId, g.UserGroupId, g.Level })
            .ToListAsync();
        return rows
            .Select(g => new SecurableGrant(
                g.SecurableType,
                g.SecurableType == SecurableType.Folder ? g.FolderId : g.ReportId,
                g.SubjectType,
                g.SubjectType == GrantSubjectType.User ? g.UserId : g.UserGroupId,
                g.Level))
            .ToList();
    }

    public static Task<AccessGrant?> FindAsync(
        IQueryable<AccessGrant> grants, SecurableType securableType, int? securableId, GrantSubjectType subjectType, int? subjectId)
    {
        var (folderId, reportId) = SecurableIds(securableType, securableId);
        var (userId, groupId) = SubjectIds(subjectType, subjectId);
        return grants.FirstOrDefaultAsync(g =>
            g.SecurableType == securableType && g.FolderId == folderId && g.ReportId == reportId
            && g.SubjectType == subjectType && g.UserId == userId && g.UserGroupId == groupId);
    }
}
