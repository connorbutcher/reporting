using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Permissions;

/// <summary>
/// Reads and edits the grants on folders and reports. Every operation requires Manager on the
/// target (an object the caller can't see is hidden as a 404 first). Managing permissions can't
/// escalate anyone past Manager, since Manager is the highest grantable level — global admin is
/// not a grant. Every change is written to an append-only audit trail, and a change that would
/// leave an object with no one able to manage it is refused (global admins excepted). Kept apart
/// from <see cref="PermissionService"/> (which caches a read snapshot per request) because these
/// methods mutate that same data.
/// </summary>
public class PermissionAdminService(
    ReportingDbContext db,
    PermissionService permissions,
    ICurrentUserAccessor currentUserAccessor)
{
    // --- reads ------------------------------------------------------------

    public async Task<PermissionsDto?> GetFolderPermissionsAsync(int folderId)
    {
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == folderId);
        if (folder is null || !await CanManageFolderAsync(folder)) return null;
        return await BuildPermissionsAsync(await BuildFolderChainAsync(folder.Id), folder.InheritsPermissions);
    }

    public async Task<PermissionsDto?> GetReportPermissionsAsync(int reportId)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == reportId);
        if (report is null || !await CanManageReportAsync(report)) return null;
        return await BuildPermissionsAsync(await BuildReportChainAsync(report), report.InheritsPermissions);
    }

    public async Task<List<GrantAuditEntryDto>?> GetFolderAuditAsync(int folderId)
    {
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == folderId);
        if (folder is null || !await CanManageFolderAsync(folder)) return null;
        return await BuildAuditAsync(SecurableType.Folder, folder.Id);
    }

    public async Task<List<GrantAuditEntryDto>?> GetReportAuditAsync(int reportId)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == reportId);
        if (report is null || !await CanManageReportAsync(report)) return null;
        return await BuildAuditAsync(SecurableType.Report, report.Id);
    }

    // --- inheritance toggle ----------------------------------------------

    public async Task<bool> SetFolderInheritanceAsync(int folderId, SetInheritanceDto dto)
    {
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == folderId);
        if (folder is null || !await CanManageFolderAsync(folder)) return false;

        if (folder.InheritsPermissions != dto.Inherits)
        {
            if (!dto.Inherits && dto.CopyDown)
                await CopyEffectiveDownAsync(await BuildFolderChainAsync(folder.Id));
            folder.InheritsPermissions = dto.Inherits;
            folder.UpdatedAt = DateTime.UtcNow;
            await AuditInheritanceAsync(SecurableType.Folder, folder.Id, dto.Inherits);
            await db.SaveChangesAsync();
        }
        return true;
    }

    public async Task<bool> SetReportInheritanceAsync(int reportId, SetInheritanceDto dto)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == reportId);
        if (report is null || !await CanManageReportAsync(report)) return false;

        if (report.InheritsPermissions != dto.Inherits)
        {
            if (!dto.Inherits && dto.CopyDown)
                await CopyEffectiveDownAsync(await BuildReportChainAsync(report));
            report.InheritsPermissions = dto.Inherits;
            report.UpdatedAt = DateTime.UtcNow;
            await AuditInheritanceAsync(SecurableType.Report, report.Id, dto.Inherits);
            await db.SaveChangesAsync();
        }
        return true;
    }

    // --- grant upsert / remove -------------------------------------------

    public async Task<AccessGrantDto?> UpsertFolderGrantAsync(int folderId, SaveGrantDto dto)
    {
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == folderId);
        if (folder is null || !await CanManageFolderAsync(folder)) return null;
        return await UpsertGrantAsync(await BuildFolderChainAsync(folder.Id), dto);
    }

    public async Task<AccessGrantDto?> UpsertReportGrantAsync(int reportId, SaveGrantDto dto)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == reportId);
        if (report is null || !await CanManageReportAsync(report)) return null;
        return await UpsertGrantAsync(await BuildReportChainAsync(report), dto);
    }

    public async Task<bool> RemoveFolderGrantAsync(int folderId, RemoveGrantDto dto)
    {
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == folderId);
        if (folder is null || !await CanManageFolderAsync(folder)) return false;
        await RemoveGrantAsync(await BuildFolderChainAsync(folder.Id), dto.SubjectType, dto.SubjectId);
        return true;
    }

    public async Task<bool> RemoveReportGrantAsync(int reportId, RemoveGrantDto dto)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == reportId);
        if (report is null || !await CanManageReportAsync(report)) return false;
        await RemoveGrantAsync(await BuildReportChainAsync(report), dto.SubjectType, dto.SubjectId);
        return true;
    }

    // --- guards -----------------------------------------------------------

    /// <summary>Hidden (→ null/404) below Viewer; throws (→403) when visible but below Manager.</summary>
    private async Task<bool> CanManageFolderAsync(Folder folder)
    {
        var level = await permissions.LevelForFolderAsync(folder.Id);
        if (level < AccessLevel.Viewer) return false;
        await permissions.RequireFolderAsync(folder.Id, AccessLevel.Manager);
        return true;
    }

    private async Task<bool> CanManageReportAsync(Report report)
    {
        var level = await permissions.LevelForReportAsync(report.Id, report.FolderId, report.InheritsPermissions);
        if (level < AccessLevel.Viewer) return false;
        await permissions.RequireReportAsync(report.Id, report.FolderId, report.InheritsPermissions, AccessLevel.Manager);
        return true;
    }

    // --- grant writes -----------------------------------------------------

    private async Task<AccessGrantDto> UpsertGrantAsync(List<ChainNode> chain, SaveGrantDto dto)
    {
        if (dto.Level == AccessLevel.None)
            throw new DataValidationException("Choose an access level (remove the grant to revoke access).");

        var leaf = chain[0];
        var (subjectId, subjectName) = await ResolveSubjectAsync(dto.SubjectType, dto.SubjectId);

        var existing = await db.AccessGrants.FirstOrDefaultAsync(g =>
            g.SecurableType == leaf.Type && g.SecurableId == leaf.Id
            && g.SubjectType == dto.SubjectType && g.SubjectId == subjectId);
        var oldLevel = existing?.Level;

        var actor = await currentUserAccessor.GetAsync();

        // Downgrading the last manager would strand the object; block it unless an admin (who can
        // always recover) is doing it deliberately.
        if (!actor.IsGlobalAdmin && oldLevel == AccessLevel.Manager && dto.Level != AccessLevel.Manager
            && await WouldLeaveNoManagerAsync(chain, dto.SubjectType, subjectId, dto.Level))
        {
            throw new DataValidationException("This would leave no one able to manage it. Add another manager first.");
        }

        if (existing is null)
        {
            db.AccessGrants.Add(new AccessGrant
            {
                SecurableType = leaf.Type,
                SecurableId = leaf.Id,
                SubjectType = dto.SubjectType,
                SubjectId = subjectId,
                Level = dto.Level,
                CreatedAt = DateTime.UtcNow,
                CreatedByUserId = actor.Id
            });
            Audit(leaf, GrantAuditAction.GrantAdded, dto.SubjectType, subjectId, null, dto.Level, actor.Id);
        }
        else
        {
            existing.Level = dto.Level;
            Audit(leaf, GrantAuditAction.GrantUpdated, dto.SubjectType, subjectId, oldLevel, dto.Level, actor.Id);
        }

        await db.SaveChangesAsync();
        return new AccessGrantDto
        {
            SubjectType = dto.SubjectType,
            SubjectId = dto.SubjectId,
            SubjectName = subjectName,
            Level = dto.Level
        };
    }

    private async Task RemoveGrantAsync(List<ChainNode> chain, GrantSubjectType subjectType, Guid? subjectRef)
    {
        var leaf = chain[0];
        var (subjectId, _) = await ResolveSubjectAsync(subjectType, subjectRef);

        var existing = await db.AccessGrants.FirstOrDefaultAsync(g =>
            g.SecurableType == leaf.Type && g.SecurableId == leaf.Id
            && g.SubjectType == subjectType && g.SubjectId == subjectId);
        if (existing is null) return;

        var actor = await currentUserAccessor.GetAsync();
        if (!actor.IsGlobalAdmin && existing.Level == AccessLevel.Manager
            && await WouldLeaveNoManagerAsync(chain, subjectType, subjectId, newLevel: null))
        {
            throw new DataValidationException("This would leave no one able to manage it. Add another manager first.");
        }

        db.AccessGrants.Remove(existing);
        Audit(leaf, GrantAuditAction.GrantRemoved, subjectType, subjectId, existing.Level, null, actor.Id);
        await db.SaveChangesAsync();
    }

    /// <summary>True when, after the proposed change to one subject's grant, no subject still resolves to Manager here.</summary>
    private async Task<bool> WouldLeaveNoManagerAsync(
        List<ChainNode> chain, GrantSubjectType subjectType, int? subjectId, AccessLevel? newLevel)
    {
        var leaf = chain[0];
        var grants = (await LoadChainGrantsAsync(chain))
            .Where(g => !(g.SecurableType == leaf.Type && g.SecurableId == leaf.Id
                && g.SubjectType == subjectType && g.SubjectId == subjectId))
            .ToList();
        if (newLevel is { } level && level != AccessLevel.None)
            grants.Add(new GrantRow(leaf.Type, leaf.Id, subjectType, subjectId, level));

        return !ComputeEffective(chain, grants).Values.Any(v => v.Level == AccessLevel.Manager);
    }

    /// <summary>Materialises the currently-effective grants onto the chain's leaf, so breaking inheritance loses no one.</summary>
    private async Task CopyEffectiveDownAsync(List<ChainNode> chain)
    {
        var leaf = chain[0];
        var effective = ComputeEffective(chain, await LoadChainGrantsAsync(chain));

        foreach (var ((subjectType, subjectId), (level, _)) in effective)
        {
            var existing = await db.AccessGrants.FirstOrDefaultAsync(g =>
                g.SecurableType == leaf.Type && g.SecurableId == leaf.Id
                && g.SubjectType == subjectType && g.SubjectId == subjectId);

            if (existing is null)
            {
                var actor = await currentUserAccessor.GetAsync();
                db.AccessGrants.Add(new AccessGrant
                {
                    SecurableType = leaf.Type,
                    SecurableId = leaf.Id,
                    SubjectType = subjectType,
                    SubjectId = subjectId,
                    Level = level,
                    CreatedAt = DateTime.UtcNow,
                    CreatedByUserId = actor.Id
                });
            }
            else if (existing.Level < level)
            {
                existing.Level = level;
            }
        }

        await db.SaveChangesAsync();
    }

    private async Task<(int? Id, string Name)> ResolveSubjectAsync(GrantSubjectType type, Guid? subjectRef) => type switch
    {
        GrantSubjectType.Everyone => (null, "Everyone"),
        GrantSubjectType.User => await db.Users.Where(u => u.RefId == subjectRef)
            .Select(u => new { u.Id, u.DisplayName }).FirstOrDefaultAsync() is { } u
            ? (u.Id, u.DisplayName)
            : throw new DataValidationException("User not found."),
        GrantSubjectType.Group => await db.UserGroups.Where(g => g.RefId == subjectRef)
            .Select(g => new { g.Id, g.Name }).FirstOrDefaultAsync() is { } grp
            ? (grp.Id, grp.Name)
            : throw new DataValidationException("Group not found."),
        _ => throw new DataValidationException("Unknown subject type.")
    };

    // --- audit ------------------------------------------------------------

    private void Audit(ChainNode leaf, GrantAuditAction action, GrantSubjectType? subjectType,
        int? subjectId, AccessLevel? oldLevel, AccessLevel? newLevel, int actorId) =>
        db.GrantAuditEntries.Add(new GrantAuditEntry
        {
            SecurableType = leaf.Type,
            SecurableId = leaf.Id,
            Action = action,
            SubjectType = subjectType,
            SubjectId = subjectId,
            OldLevel = oldLevel,
            NewLevel = newLevel,
            ActorUserId = actorId,
            CreatedAt = DateTime.UtcNow
        });

    private async Task AuditInheritanceAsync(SecurableType type, int id, bool inherits)
    {
        var actor = await currentUserAccessor.GetAsync();
        db.GrantAuditEntries.Add(new GrantAuditEntry
        {
            SecurableType = type,
            SecurableId = id,
            Action = inherits ? GrantAuditAction.InheritanceEnabled : GrantAuditAction.InheritanceDisabled,
            ActorUserId = actor.Id,
            CreatedAt = DateTime.UtcNow
        });
    }

    private async Task<List<GrantAuditEntryDto>> BuildAuditAsync(SecurableType type, int id)
    {
        var entries = await db.GrantAuditEntries
            .Where(a => a.SecurableType == type && a.SecurableId == id)
            .OrderByDescending(a => a.CreatedAt)
            .Take(100)
            .ToListAsync();

        var users = (await db.Users.Select(u => new { u.Id, u.DisplayName }).ToListAsync())
            .ToDictionary(u => u.Id, u => u.DisplayName);
        var groups = (await db.UserGroups.Select(g => new { g.Id, g.Name }).ToListAsync())
            .ToDictionary(g => g.Id, g => g.Name);

        string SubjectName(GrantSubjectType? subjectType, int? subjectId) => subjectType switch
        {
            GrantSubjectType.Everyone => "Everyone",
            GrantSubjectType.User when subjectId is { } uid => users.GetValueOrDefault(uid, "(unknown)"),
            GrantSubjectType.Group when subjectId is { } gid => groups.GetValueOrDefault(gid, "(unknown)"),
            _ => "(unknown)"
        };

        return entries.Select(e => new GrantAuditEntryDto
        {
            At = e.CreatedAt,
            ActorName = users.GetValueOrDefault(e.ActorUserId, "(system)"),
            Action = e.Action,
            SubjectType = e.SubjectType,
            SubjectName = e.SubjectType is null ? null : SubjectName(e.SubjectType, e.SubjectId),
            OldLevel = e.OldLevel,
            NewLevel = e.NewLevel
        }).ToList();
    }

    // --- the effective picture -------------------------------------------

    /// <summary>One securable in an inheritance chain, with the display name and inherit flag needed to explain a grant's origin.</summary>
    private sealed record ChainNode(SecurableType Type, int? Id, string Name, bool Inherits);

    private sealed record GrantRow(SecurableType SecurableType, int? SecurableId, GrantSubjectType SubjectType, int? SubjectId, AccessLevel Level);

    private async Task<List<ChainNode>> BuildFolderChainAsync(int folderId)
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
            if (++guard > 10_000) break;
        }
        chain.Add(new ChainNode(SecurableType.Root, null, "Root", false));
        return chain;
    }

    private async Task<List<ChainNode>> BuildReportChainAsync(Report report)
    {
        var chain = new List<ChainNode> { new(SecurableType.Report, report.Id, report.Name, report.InheritsPermissions) };
        chain.AddRange(report.FolderId is { } fid
            ? await BuildFolderChainAsync(fid)
            : [new ChainNode(SecurableType.Root, null, "Root", false)]);
        return chain;
    }

    private async Task<List<GrantRow>> LoadChainGrantsAsync(List<ChainNode> chain)
    {
        var folderIds = chain.Where(n => n.Type == SecurableType.Folder).Select(n => n.Id!.Value).ToList();
        var reportIds = chain.Where(n => n.Type == SecurableType.Report).Select(n => n.Id!.Value).ToList();
        var wantsRoot = chain.Any(n => n.Type == SecurableType.Root);

        return await db.AccessGrants
            .Where(g =>
                (g.SecurableType == SecurableType.Folder && g.SecurableId != null && folderIds.Contains(g.SecurableId.Value))
                || (g.SecurableType == SecurableType.Report && g.SecurableId != null && reportIds.Contains(g.SecurableId.Value))
                || (wantsRoot && g.SecurableType == SecurableType.Root))
            .Select(g => new GrantRow(g.SecurableType, g.SecurableId, g.SubjectType, g.SubjectId, g.Level))
            .ToListAsync();
    }

    /// <summary>Walks the chain leaf→root (stopping at a broken node), keeping each subject's highest grant and where it lives.</summary>
    private static Dictionary<(GrantSubjectType, int?), (AccessLevel Level, ChainNode Source)> ComputeEffective(
        List<ChainNode> chain, List<GrantRow> grants)
    {
        var effective = new Dictionary<(GrantSubjectType, int?), (AccessLevel, ChainNode)>();
        foreach (var node in chain)
        {
            foreach (var grant in grants.Where(g => g.SecurableType == node.Type && g.SecurableId == node.Id))
            {
                var key = (grant.SubjectType, grant.SubjectId);
                // Leaf-first walk means the first grant at a level is the nearest; only a strictly
                // higher level from further up replaces it.
                if (!effective.TryGetValue(key, out var current) || grant.Level > current.Item1)
                    effective[key] = (grant.Level, node);
            }
            if (!node.Inherits) break;
        }
        return effective;
    }

    private async Task<PermissionsDto> BuildPermissionsAsync(List<ChainNode> chain, bool inheritsPermissions)
    {
        var grants = await LoadChainGrantsAsync(chain);
        var users = (await db.Users.Select(u => new { u.Id, u.RefId, u.DisplayName }).ToListAsync())
            .ToDictionary(u => u.Id, u => (u.RefId, u.DisplayName));
        var groups = (await db.UserGroups.Select(g => new { g.Id, g.RefId, g.Name }).ToListAsync())
            .ToDictionary(g => g.Id, g => (g.RefId, g.Name));

        (Guid? Ref, string Name) Describe(GrantSubjectType type, int? id) => type switch
        {
            GrantSubjectType.Everyone => (null, "Everyone"),
            GrantSubjectType.User when id is { } uid && users.TryGetValue(uid, out var u) => (u.RefId, u.DisplayName),
            GrantSubjectType.Group when id is { } gid && groups.TryGetValue(gid, out var g) => (g.RefId, g.Name),
            _ => (null, "(unknown)")
        };

        AccessGrantDto ToDto(GrantSubjectType type, int? id, AccessLevel level, bool inherited, string? from)
        {
            var (subjectRef, name) = Describe(type, id);
            return new AccessGrantDto
            {
                SubjectType = type,
                SubjectId = subjectRef,
                SubjectName = name,
                Level = level,
                Inherited = inherited,
                InheritedFrom = from
            };
        }

        var leaf = chain[0];
        var explicitGrants = grants
            .Where(g => g.SecurableType == leaf.Type && g.SecurableId == leaf.Id)
            .Select(g => ToDto(g.SubjectType, g.SubjectId, g.Level, inherited: false, from: null))
            .OrderByDescending(d => d.Level).ThenBy(d => d.SubjectName)
            .ToList();

        var effective = ComputeEffective(chain, grants)
            .Select(e =>
            {
                var (subjectType, subjectId) = e.Key;
                var (level, source) = e.Value;
                var inherited = source != leaf;
                return ToDto(subjectType, subjectId, level, inherited, inherited ? source.Name : null);
            })
            .OrderByDescending(d => d.Level).ThenBy(d => d.SubjectName)
            .ToList();

        return new PermissionsDto
        {
            InheritsPermissions = inheritsPermissions,
            Explicit = explicitGrants,
            Effective = effective
        };
    }
}
