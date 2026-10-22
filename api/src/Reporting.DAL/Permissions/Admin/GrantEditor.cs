using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Permissions;

/// <summary>
/// Adds, changes and removes the grants on a chain's leaf. Refuses a change that would leave no one able to
/// manage it, unless a global admin makes it.
/// </summary>
internal sealed class GrantEditor(
    ReportingDbContext db,
    ICurrentUserAccessor currentUserAccessor,
    PermissionChain chains,
    GrantAuditLog audit)
{
    private const string NoManagerLeft = "This would leave no one able to manage it. Add another manager first.";

    public async Task<AccessGrantDto> UpsertAsync(List<ChainNode> chain, SaveGrantDto dto)
    {
        if (dto.Level == AccessLevel.None)
        {
            throw new DataValidationException("Choose an access level (remove the grant to revoke access).");
        }

        var leaf = chain[0];
        var (subjectId, subjectName) = await ResolveSubjectAsync(dto.SubjectType, dto.SubjectId);
        await EnsureNotGlobalAdminAsync(dto.SubjectType, subjectId, subjectName);

        var existing = await GrantKeys.FindAsync(db.AccessGrants, leaf.Type, leaf.Id, dto.SubjectType, subjectId);
        var oldLevel = existing?.Level;
        var actor = await currentUserAccessor.GetAsync();

        if (!actor.IsGlobalAdmin && oldLevel == AccessLevel.Manager && dto.Level != AccessLevel.Manager
            && await WouldLeaveNoManagerAsync(chain, dto.SubjectType, subjectId, dto.Level))
        {
            throw new DataValidationException(NoManagerLeft);
        }

        if (existing is null)
        {
            db.AccessGrants.Add(NewGrant(leaf, dto.SubjectType, subjectId, dto.Level, actor.Id));
            audit.AddGrantChange(leaf, GrantAuditAction.GrantAdded, dto.SubjectType, subjectId, null, dto.Level, actor.Id);
        }
        else
        {
            existing.Level = dto.Level;
            audit.AddGrantChange(leaf, GrantAuditAction.GrantUpdated, dto.SubjectType, subjectId, oldLevel, dto.Level, actor.Id);
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

    public async Task RemoveAsync(List<ChainNode> chain, GrantSubjectType subjectType, Guid? subjectRef)
    {
        var leaf = chain[0];
        var (subjectId, _) = await ResolveSubjectAsync(subjectType, subjectRef);
        var existing = await GrantKeys.FindAsync(db.AccessGrants, leaf.Type, leaf.Id, subjectType, subjectId);
        if (existing is null)
        {
            return;
        }

        var actor = await currentUserAccessor.GetAsync();
        if (!actor.IsGlobalAdmin && existing.Level == AccessLevel.Manager
            && await WouldLeaveNoManagerAsync(chain, subjectType, subjectId, newLevel: null))
        {
            throw new DataValidationException(NoManagerLeft);
        }

        db.AccessGrants.Remove(existing);
        audit.AddGrantChange(leaf, GrantAuditAction.GrantRemoved, subjectType, subjectId, existing.Level, null, actor.Id);
        await db.SaveChangesAsync();
    }

    /// <summary>Writes the currently effective grants onto the leaf, so breaking inheritance loses no one.</summary>
    public async Task CopyEffectiveDownAsync(List<ChainNode> chain)
    {
        var leaf = chain[0];
        var effective = PermissionChain.Effective(chain, await chains.LoadGrantsAsync(chain));

        foreach (var ((subjectType, subjectId), grant) in effective)
        {
            var existing = await GrantKeys.FindAsync(db.AccessGrants, leaf.Type, leaf.Id, subjectType, subjectId);
            if (existing is null)
            {
                var actor = await currentUserAccessor.GetAsync();
                db.AccessGrants.Add(NewGrant(leaf, subjectType, subjectId, grant.Level, actor.Id));
            }
            else if (existing.Level < grant.Level)
            {
                existing.Level = grant.Level;
            }
        }

        await db.SaveChangesAsync();
    }

    /// <summary>A global admin already manages everything, so a grant to one would only go stale.</summary>
    private async Task EnsureNotGlobalAdminAsync(GrantSubjectType subjectType, int? subjectId, string subjectName)
    {
        if (subjectType == GrantSubjectType.User
            && await db.AppPermissionGrants.AnyAsync(g => g.Permission == AppPermission.GlobalAdmin && g.UserId == subjectId))
        {
            throw new DataValidationException(
                $"{subjectName} is a global administrator and already has full access, so it can't be shared with them.");
        }
    }

    private async Task<bool> WouldLeaveNoManagerAsync(
        List<ChainNode> chain, GrantSubjectType subjectType, int? subjectId, AccessLevel? newLevel)
    {
        var leaf = chain[0];
        var grants = (await chains.LoadGrantsAsync(chain))
            .Where(g => !(g.SecurableType == leaf.Type && g.SecurableId == leaf.Id
                && g.SubjectType == subjectType && g.SubjectId == subjectId))
            .ToList();
        if (newLevel is { } level && level != AccessLevel.None)
        {
            grants.Add(new SecurableGrant(leaf.Type, leaf.Id, subjectType, subjectId, level));
        }

        return !PermissionChain.Effective(chain, grants).Values.Any(v => v.Level == AccessLevel.Manager);
    }

    private async Task<(int? Id, string Name)> ResolveSubjectAsync(GrantSubjectType type, Guid? subjectRef)
    {
        switch (type)
        {
            case GrantSubjectType.Everyone:
                return (null, "Everyone");
            case GrantSubjectType.User:
                var user = await db.Users.Where(u => u.RefId == subjectRef)
                    .Select(u => new { u.Id, u.DisplayName }).FirstOrDefaultAsync()
                    ?? throw new DataValidationException("User not found.");
                return (user.Id, user.DisplayName);
            case GrantSubjectType.Group:
                var group = await db.UserGroups.Where(g => g.RefId == subjectRef)
                    .Select(g => new { g.Id, g.Name }).FirstOrDefaultAsync()
                    ?? throw new DataValidationException("Group not found.");
                return (group.Id, group.Name);
            default:
                throw new DataValidationException("Unknown subject type.");
        }
    }

    private static AccessGrant NewGrant(ChainNode leaf, GrantSubjectType subjectType, int? subjectId, AccessLevel level, int actorId)
    {
        var (folderId, reportId) = GrantKeys.SecurableIds(leaf.Type, leaf.Id);
        var (userId, groupId) = GrantKeys.SubjectIds(subjectType, subjectId);
        return new AccessGrant
        {
            SecurableType = leaf.Type,
            FolderId = folderId,
            ReportId = reportId,
            SubjectType = subjectType,
            UserId = userId,
            UserGroupId = groupId,
            Level = level,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = actorId
        };
    }
}
