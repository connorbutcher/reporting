using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Permissions;

/// <summary>
/// The current user's effective access level on a securable. Loads the folder tree and the grants that can
/// match this user once per request, then answers from memory, so filtering a list costs no extra round trips.
/// Global admins short-circuit before anything is loaded.
/// </summary>
public class PermissionService(ReportingDbContext db, ICurrentUserAccessor currentUserAccessor)
{
    private AccessSnapshot? snapshot;

    public async Task<AccessLevel> LevelForRootAsync()
    {
        return (await LoadAsync()).ResolveRoot();
    }

    public async Task<AccessLevel> LevelForFolderAsync(int folderId)
    {
        return (await LoadAsync()).ResolveFolder(folderId);
    }

    public async Task<AccessLevel> LevelForReportAsync(int reportId, int? folderId, bool inheritsPermissions)
    {
        return (await LoadAsync()).ResolveReport(reportId, folderId, inheritsPermissions);
    }

    private async Task<AccessSnapshot> LoadAsync()
    {
        if (snapshot is not null)
        {
            return snapshot;
        }

        var user = await currentUserAccessor.GetAsync();
        if (user.IsGlobalAdmin)
        {
            return snapshot = AccessSnapshot.ForAdmin(user);
        }

        var folders = await LoadFoldersAsync();
        var grants = await LoadGrantsAsync(user);
        snapshot = new AccessSnapshot(user, folders, Lines(grants, SecurableType.Root), ById(grants, SecurableType.Folder), ById(grants, SecurableType.Report));
        return snapshot;
    }

    private async Task<Dictionary<int, FolderRow>> LoadFoldersAsync()
    {
        var folders = await db.Folders
            .Select(f => new { f.Id, f.ParentFolderId, f.InheritsPermissions })
            .ToListAsync();
        return folders.ToDictionary(f => f.Id, f => new FolderRow(f.ParentFolderId, f.InheritsPermissions));
    }

    /// <summary>Only the user's own, their groups' and everyone's grants can match, riding the subject index.</summary>
    private Task<List<SecurableGrant>> LoadGrantsAsync(ICurrentUser user)
    {
        var groupIds = user.GroupIds.ToList();
        return GrantKeys.LoadAsync(db.AccessGrants
            .Where(g => g.SubjectType == GrantSubjectType.Everyone
                || (g.SubjectType == GrantSubjectType.User && g.UserId == user.Id)
                || (g.SubjectType == GrantSubjectType.Group && g.UserGroupId != null && groupIds.Contains(g.UserGroupId.Value))));
    }

    private static List<GrantLine> Lines(List<SecurableGrant> grants, SecurableType type)
    {
        return grants
            .Where(g => g.SecurableType == type)
            .Select(g => g.ToLine())
            .ToList();
    }

    private static Dictionary<int, IReadOnlyList<GrantLine>> ById(List<SecurableGrant> grants, SecurableType type)
    {
        return grants
            .Where(g => g.SecurableType == type && g.SecurableId != null)
            .GroupBy(g => g.SecurableId!.Value)
            .ToDictionary(
                grp => grp.Key,
                grp => (IReadOnlyList<GrantLine>)grp.Select(g => g.ToLine()).ToList());
    }
}
