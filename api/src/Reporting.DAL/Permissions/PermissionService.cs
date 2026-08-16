using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Permissions;

/// <summary>
/// Resolves a user's effective <see cref="AccessLevel"/> on a folder, report, or the root
/// scope by loading its inheritance chain and its grants, then handing them to the pure
/// <see cref="AccessResolver"/>. It loads the (small) folder set to walk ancestors in
/// memory; batching this for whole-listing visibility is a later optimisation.
/// </summary>
public class PermissionService(ReportingDbContext db)
{
    public Task<AccessLevel> ResolveAsync(ICurrentUser user, SecurableType type, int? securableId) => type switch
    {
        SecurableType.Root => ResolveForRootAsync(user),
        SecurableType.Folder when securableId is { } id => ResolveForFolderAsync(user, id),
        SecurableType.Report when securableId is { } id => ResolveForReportAsync(user, id),
        _ => Task.FromResult(AccessLevel.None)
    };

    public async Task<AccessLevel> ResolveForRootAsync(ICurrentUser user)
    {
        if (user.IsGlobalAdmin) return AccessLevel.Manager;
        var root = new SecurableNode(false, await RootGrantsAsync(), null);
        return AccessResolver.Resolve(user, root);
    }

    public async Task<AccessLevel> ResolveForFolderAsync(ICurrentUser user, int folderId)
    {
        if (user.IsGlobalAdmin) return AccessLevel.Manager;

        var folders = await FolderMapAsync();
        if (!folders.ContainsKey(folderId)) return AccessLevel.None;

        var chain = FolderChain(folderId, folders);
        var grants = await FolderAndRootGrantsAsync(chain);
        return AccessResolver.Resolve(user, BuildFolderNode(chain, grants));
    }

    public async Task<AccessLevel> ResolveForReportAsync(ICurrentUser user, int reportId)
    {
        if (user.IsGlobalAdmin) return AccessLevel.Manager;

        var report = await db.Reports
            .Where(r => r.Id == reportId)
            .Select(r => new { r.FolderId, r.InheritsPermissions })
            .FirstOrDefaultAsync();
        if (report is null) return AccessLevel.None;

        var folders = await FolderMapAsync();
        var chain = report.FolderId is { } fid && folders.ContainsKey(fid)
            ? FolderChain(fid, folders)
            : new List<FolderLink>();

        var grants = await FolderAndRootGrantsAsync(chain);
        var reportGrants = await GrantsForAsync(SecurableType.Report, reportId);

        // The report is the leaf; its parent is its folder chain (or the root directly).
        var node = new SecurableNode(report.InheritsPermissions, reportGrants, BuildFolderNode(chain, grants));
        return AccessResolver.Resolve(user, node);
    }

    // --- chain building ---------------------------------------------------

    /// <summary>Links the root node, then the folder chain from root-level down to the leaf.</summary>
    private static SecurableNode BuildFolderNode(List<FolderLink> leafToRoot, GrantBundle grants)
    {
        SecurableNode node = new(false, grants.Root, null);
        for (var i = leafToRoot.Count - 1; i >= 0; i--)
        {
            node = new SecurableNode(leafToRoot[i].Inherits, grants.ForFolder(leafToRoot[i].Id), node);
        }
        return node;
    }

    /// <summary>Folder ids and their inherit flags from the given folder up to a root-level folder.</summary>
    private static List<FolderLink> FolderChain(int folderId, IReadOnlyDictionary<int, (int? Parent, bool Inherits)> map)
    {
        var chain = new List<FolderLink>();
        int? current = folderId;
        var guard = 0;
        while (current is { } id && map.TryGetValue(id, out var folder))
        {
            chain.Add(new FolderLink(id, folder.Inherits));
            current = folder.Parent;
            if (++guard > 10_000) break; // defends against a corrupt parent cycle
        }
        return chain;
    }

    // --- data loading -----------------------------------------------------

    private async Task<Dictionary<int, (int? Parent, bool Inherits)>> FolderMapAsync() =>
        (await db.Folders
            .Select(f => new { f.Id, f.ParentFolderId, f.InheritsPermissions })
            .ToListAsync())
        .ToDictionary(f => f.Id, f => ((int?)f.ParentFolderId, f.InheritsPermissions));

    private async Task<GrantBundle> FolderAndRootGrantsAsync(List<FolderLink> chain)
    {
        var folderIds = chain.Select(c => c.Id).ToList();
        var byFolder = folderIds.Count == 0
            ? new Dictionary<int, List<GrantLine>>()
            : (await db.AccessGrants
                    .Where(g => g.SecurableType == SecurableType.Folder
                        && g.SecurableId != null
                        && folderIds.Contains(g.SecurableId.Value))
                    .Select(g => new { g.SecurableId, g.SubjectType, g.SubjectId, g.Level })
                    .ToListAsync())
                .GroupBy(g => g.SecurableId!.Value)
                .ToDictionary(
                    grp => grp.Key,
                    grp => grp.Select(g => new GrantLine(g.SubjectType, g.SubjectId, g.Level)).ToList());

        return new GrantBundle(await RootGrantsAsync(), byFolder);
    }

    private Task<List<GrantLine>> RootGrantsAsync() => GrantsForAsync(SecurableType.Root, null);

    private async Task<List<GrantLine>> GrantsForAsync(SecurableType type, int? securableId) =>
        (await db.AccessGrants
            .Where(g => g.SecurableType == type && g.SecurableId == securableId)
            .Select(g => new { g.SubjectType, g.SubjectId, g.Level })
            .ToListAsync())
        .Select(g => new GrantLine(g.SubjectType, g.SubjectId, g.Level))
        .ToList();

    private sealed record FolderLink(int Id, bool Inherits);

    private sealed record GrantBundle(
        IReadOnlyList<GrantLine> Root,
        IReadOnlyDictionary<int, List<GrantLine>> ByFolder)
    {
        public IReadOnlyList<GrantLine> ForFolder(int id) =>
            ByFolder.TryGetValue(id, out var grants) ? grants : Array.Empty<GrantLine>();
    }
}
