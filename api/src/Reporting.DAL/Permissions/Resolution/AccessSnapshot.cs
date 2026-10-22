using Reporting.Abstractions;

namespace Reporting.DAL.Permissions;

/// <summary>The loaded-once view of the tree and this user's grants, resolving any securable in memory.</summary>
internal sealed class AccessSnapshot(
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

    public static AccessSnapshot ForAdmin(ICurrentUser user)
    {
        return new AccessSnapshot(
            user,
            new Dictionary<int, FolderRow>(),
            NoGrants,
            new Dictionary<int, IReadOnlyList<GrantLine>>(),
            new Dictionary<int, IReadOnlyList<GrantLine>>());
    }

    public AccessLevel ResolveRoot()
    {
        return user.IsGlobalAdmin ? AccessLevel.Manager : AccessResolver.Resolve(user, RootNode());
    }

    public AccessLevel ResolveFolder(int folderId)
    {
        if (user.IsGlobalAdmin)
        {
            return AccessLevel.Manager;
        }

        if (!folders.ContainsKey(folderId))
        {
            return AccessLevel.None;
        }

        if (folderLevels.TryGetValue(folderId, out var cached))
        {
            return cached;
        }

        return folderLevels[folderId] = AccessResolver.Resolve(user, FolderNode(folderId));
    }

    public AccessLevel ResolveReport(int reportId, int? folderId, bool inheritsPermissions)
    {
        if (user.IsGlobalAdmin)
        {
            return AccessLevel.Manager;
        }

        if (reportLevels.TryGetValue(reportId, out var cached))
        {
            return cached;
        }

        var parent = folderId is { } id && folders.ContainsKey(id) ? FolderNode(id) : RootNode();
        var node = new SecurableNode(inheritsPermissions, Grants(reportGrants, reportId), parent);
        return reportLevels[reportId] = AccessResolver.Resolve(user, node);
    }

    private SecurableNode RootNode()
    {
        return rootNode ??= new SecurableNode(InheritsPermissions: false, rootGrants, null);
    }

    private SecurableNode FolderNode(int folderId)
    {
        if (folderNodes.TryGetValue(folderId, out var existing))
        {
            return existing;
        }

        // Walk up collecting the not-yet-built tail, stopping at a cached ancestor or the root.
        var pending = new List<int>();
        int? current = folderId;
        var guard = 0;
        while (current is { } id && folders.ContainsKey(id) && !folderNodes.ContainsKey(id))
        {
            pending.Add(id);
            current = folders[id].ParentFolderId;
            // Defends against a corrupt parent cycle.
            if (++guard > 10_000)
            {
                break;
            }
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

    private static IReadOnlyList<GrantLine> Grants(IReadOnlyDictionary<int, IReadOnlyList<GrantLine>> map, int id)
    {
        return map.TryGetValue(id, out var grants) ? grants : NoGrants;
    }
}
