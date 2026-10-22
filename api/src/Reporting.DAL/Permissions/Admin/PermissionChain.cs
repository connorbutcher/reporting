using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Permissions;

/// <summary>Builds a securable's chain, leaf first and ending at the root, and resolves the grants along it.</summary>
internal sealed class PermissionChain(ReportingDbContext db)
{
    private static readonly ChainNode Root = new(SecurableType.Root, null, "Root", false);

    public async Task<List<ChainNode>> ForFolderAsync(int folderId)
    {
        var folders = await db.Folders
            .Select(f => new { f.Id, f.ParentFolderId, f.Name, f.InheritsPermissions })
            .ToListAsync();
        var byId = folders.ToDictionary(f => f.Id);

        var chain = new List<ChainNode>();
        int? current = folderId;
        var guard = 0;
        while (current is { } id && byId.TryGetValue(id, out var f))
        {
            chain.Add(new ChainNode(SecurableType.Folder, id, f.Name, f.InheritsPermissions));
            current = f.ParentFolderId;
            if (++guard > 10_000)
            {
                break;
            }
        }
        chain.Add(Root);
        return chain;
    }

    public async Task<List<ChainNode>> ForReportAsync(Report report)
    {
        var chain = new List<ChainNode> { new(SecurableType.Report, report.Id, report.Name, report.InheritsPermissions) };
        chain.AddRange(report.FolderId is { } fid ? await ForFolderAsync(fid) : [Root]);
        return chain;
    }

    public Task<List<SecurableGrant>> LoadGrantsAsync(List<ChainNode> chain)
    {
        var folderIds = chain.Where(n => n.Type == SecurableType.Folder).Select(n => n.Id!.Value).ToList();
        var reportIds = chain.Where(n => n.Type == SecurableType.Report).Select(n => n.Id!.Value).ToList();
        var wantsRoot = chain.Any(n => n.Type == SecurableType.Root);

        return GrantKeys.LoadAsync(db.AccessGrants.Where(g =>
            (g.SecurableType == SecurableType.Folder && g.FolderId != null && folderIds.Contains(g.FolderId.Value))
            || (g.SecurableType == SecurableType.Report && g.ReportId != null && reportIds.Contains(g.ReportId.Value))
            || (wantsRoot && g.SecurableType == SecurableType.Root)));
    }

    /// <summary>Walks leaf to root, stopping after a node that breaks inheritance, keeping each subject's highest grant.</summary>
    public static Dictionary<(GrantSubjectType, int?), EffectiveGrant> Effective(List<ChainNode> chain, List<SecurableGrant> grants)
    {
        var effective = new Dictionary<(GrantSubjectType, int?), EffectiveGrant>();
        foreach (var node in chain)
        {
            foreach (var grant in grants.Where(g => g.SecurableType == node.Type && g.SecurableId == node.Id))
            {
                // Leaf first, so only a strictly higher level from further up replaces the nearest.
                var key = (grant.SubjectType, grant.SubjectId);
                if (!effective.TryGetValue(key, out var current) || grant.Level > current.Level)
                {
                    effective[key] = new EffectiveGrant(grant.Level, node);
                }
            }
            if (!node.Inherits)
            {
                break;
            }
        }
        return effective;
    }
}
