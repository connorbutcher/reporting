using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Permissions;

/// <summary>
/// Resolves and enforces the current user's access. On first use it loads a snapshot of the
/// folder tree and the grants that can affect this user once, then answers any number of
/// folder/report/root questions from memory via the pure <see cref="AccessResolver"/> — so
/// filtering a whole list costs no extra round trips. Only grants for the user, their groups,
/// or everyone are loaded (the only ones resolution can match), each folder's node and resolved
/// level is memoised, and global admins short-circuit before anything is loaded at all. Scoped,
/// so the snapshot lives for one request.
/// </summary>
public class PermissionService(ReportingDbContext db, ICurrentUserAccessor currentUserAccessor)
{
    private Snapshot? snapshot;

    // --- level queries ----------------------------------------------------

    public async Task<AccessLevel> LevelForRootAsync() => (await LoadAsync()).ResolveRoot();

    public async Task<AccessLevel> LevelForFolderAsync(int folderId) => (await LoadAsync()).ResolveFolder(folderId);

    public async Task<AccessLevel> LevelForReportAsync(int reportId, int? folderId, bool inheritsPermissions) =>
        (await LoadAsync()).ResolveReport(reportId, folderId, inheritsPermissions);

    // --- visibility (>= Viewer) ------------------------------------------

    public async Task<bool> CanSeeFolderAsync(int folderId) =>
        await LevelForFolderAsync(folderId) >= AccessLevel.Viewer;

    public async Task<bool> CanSeeReportAsync(int reportId, int? folderId, bool inheritsPermissions) =>
        await LevelForReportAsync(reportId, folderId, inheritsPermissions) >= AccessLevel.Viewer;

    // --- guards (throw AccessDeniedException below the required level) -----

    public async Task RequireFolderAsync(int folderId, AccessLevel required) =>
        Require(await LevelForFolderAsync(folderId), required);

    public async Task RequireReportAsync(int reportId, int? folderId, bool inheritsPermissions, AccessLevel required) =>
        Require(await LevelForReportAsync(reportId, folderId, inheritsPermissions), required);

    /// <summary>Creating an item inside a folder (or at the root when null) needs Editor on that container.</summary>
    public Task RequireCreateInAsync(int? folderId) => folderId is { } id
        ? RequireFolderAsync(id, AccessLevel.Editor)
        : RootEditorAsync();

    private async Task RootEditorAsync() => Require(await LevelForRootAsync(), AccessLevel.Editor);

    private static void Require(AccessLevel actual, AccessLevel required)
    {
        if (actual < required) throw new AccessDeniedException($"This action requires {required} access.");
    }

    // --- snapshot ---------------------------------------------------------

    private async Task<Snapshot> LoadAsync()
    {
        if (snapshot is not null) return snapshot;

        var user = await currentUserAccessor.GetAsync();
        // An admin resolves to Manager everywhere, so there's nothing to load.
        if (user.IsGlobalAdmin) return snapshot = Snapshot.ForAdmin(user);

        var folders = (await db.Folders
                .Select(f => new { f.Id, f.ParentFolderId, f.InheritsPermissions })
                .ToListAsync())
            .ToDictionary(f => f.Id, f => new FolderRow(f.ParentFolderId, f.InheritsPermissions));

        // Only grants that can match this user matter to resolution — their own, their groups',
        // and everyone's. Loading the rest (grants for other users/groups) would be discarded, so
        // the query filters them out up front, riding the (SubjectType, SubjectId) index.
        var groupIds = user.GroupIds.ToList();
        var grants = await db.AccessGrants
            .Where(g => g.SubjectType == GrantSubjectType.Everyone
                || (g.SubjectType == GrantSubjectType.User && g.SubjectId == user.Id)
                || (g.SubjectType == GrantSubjectType.Group && g.SubjectId != null && groupIds.Contains(g.SubjectId.Value)))
            .Select(g => new { g.SecurableType, g.SecurableId, g.SubjectType, g.SubjectId, g.Level })
            .ToListAsync();

        List<GrantLine> Lines(SecurableType type) => grants
            .Where(g => g.SecurableType == type)
            .Select(g => new GrantLine(g.SubjectType, g.SubjectId, g.Level))
            .ToList();

        Dictionary<int, IReadOnlyList<GrantLine>> ById(SecurableType type) => grants
            .Where(g => g.SecurableType == type && g.SecurableId != null)
            .GroupBy(g => g.SecurableId!.Value)
            .ToDictionary(
                grp => grp.Key,
                grp => (IReadOnlyList<GrantLine>)grp.Select(g => new GrantLine(g.SubjectType, g.SubjectId, g.Level)).ToList());

        snapshot = new Snapshot(user, folders, Lines(SecurableType.Root), ById(SecurableType.Folder), ById(SecurableType.Report));
        return snapshot;
    }

    private sealed record FolderRow(int? ParentFolderId, bool Inherits);

    /// <summary>The loaded-once view of the tree and this user's grants, resolving any securable in memory.</summary>
    private sealed class Snapshot(
        ICurrentUser user,
        IReadOnlyDictionary<int, FolderRow> folders,
        IReadOnlyList<GrantLine> rootGrants,
        IReadOnlyDictionary<int, IReadOnlyList<GrantLine>> folderGrants,
        IReadOnlyDictionary<int, IReadOnlyList<GrantLine>> reportGrants)
    {
        private static readonly IReadOnlyList<GrantLine> NoGrants = Array.Empty<GrantLine>();

        // Each folder's chain node and each object's resolved level are built once and reused, so
        // filtering a list of siblings doesn't rebuild their shared ancestors or re-resolve repeats.
        private readonly Dictionary<int, SecurableNode> folderNodes = new();
        private readonly Dictionary<int, AccessLevel> folderLevels = new();
        private readonly Dictionary<int, AccessLevel> reportLevels = new();
        private SecurableNode? rootNode;

        public static Snapshot ForAdmin(ICurrentUser user) => new(
            user,
            new Dictionary<int, FolderRow>(),
            NoGrants,
            new Dictionary<int, IReadOnlyList<GrantLine>>(),
            new Dictionary<int, IReadOnlyList<GrantLine>>());

        public AccessLevel ResolveRoot() =>
            user.IsGlobalAdmin ? AccessLevel.Manager : AccessResolver.Resolve(user, RootNode());

        public AccessLevel ResolveFolder(int folderId)
        {
            if (user.IsGlobalAdmin) return AccessLevel.Manager;
            if (!folders.ContainsKey(folderId)) return AccessLevel.None;
            if (folderLevels.TryGetValue(folderId, out var cached)) return cached;
            return folderLevels[folderId] = AccessResolver.Resolve(user, FolderNode(folderId));
        }

        public AccessLevel ResolveReport(int reportId, int? folderId, bool inheritsPermissions)
        {
            if (user.IsGlobalAdmin) return AccessLevel.Manager;
            if (reportLevels.TryGetValue(reportId, out var cached)) return cached;
            var parent = folderId is { } id && folders.ContainsKey(id) ? FolderNode(id) : RootNode();
            var node = new SecurableNode(inheritsPermissions, Grants(reportGrants, reportId), parent);
            return reportLevels[reportId] = AccessResolver.Resolve(user, node);
        }

        private SecurableNode RootNode() => rootNode ??= new(InheritsPermissions: false, rootGrants, null);

        private SecurableNode FolderNode(int folderId)
        {
            if (folderNodes.TryGetValue(folderId, out var existing)) return existing;

            // Walk up collecting the not-yet-built tail, stopping at a cached ancestor or the root.
            var pending = new List<int>();
            int? current = folderId;
            var guard = 0;
            while (current is { } id && folders.ContainsKey(id) && !folderNodes.ContainsKey(id))
            {
                pending.Add(id);
                current = folders[id].ParentFolderId;
                if (++guard > 10_000) break; // defends against a corrupt parent cycle
            }

            var node = current is { } cachedId && folderNodes.TryGetValue(cachedId, out var cachedParent)
                ? cachedParent
                : RootNode();

            // Build downward so each folder's node is created once and shared by its siblings and descendants.
            for (var i = pending.Count - 1; i >= 0; i--)
            {
                node = new SecurableNode(folders[pending[i]].Inherits, Grants(folderGrants, pending[i]), node);
                folderNodes[pending[i]] = node;
            }
            return folderNodes[folderId];
        }

        private static IReadOnlyList<GrantLine> Grants(IReadOnlyDictionary<int, IReadOnlyList<GrantLine>> map, int id) =>
            map.TryGetValue(id, out var grants) ? grants : NoGrants;
    }
}
