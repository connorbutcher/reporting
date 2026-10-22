using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Permissions;

/// <summary>The append-only trail of grant and inheritance changes on a securable.</summary>
internal sealed class GrantAuditLog(ReportingDbContext db, ICurrentUserAccessor currentUserAccessor)
{
    public void AddGrantChange(ChainNode leaf, GrantAuditAction action, GrantSubjectType? subjectType,
        int? subjectId, AccessLevel? oldLevel, AccessLevel? newLevel, int actorId)
    {
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
    }

    public async Task AddInheritanceChangeAsync(SecurableType type, int id, bool inherits)
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

    /// <summary>The latest 100 entries, newest first.</summary>
    public async Task<List<GrantAuditEntryDto>> ReadAsync(SecurableType type, int id)
    {
        var entries = await db.GrantAuditEntries
            .Where(a => a.SecurableType == type && a.SecurableId == id)
            .OrderByDescending(a => a.CreatedAt)
            .Take(100)
            .ToListAsync();
        var subjects = await SubjectDirectory.LoadAsync(db);

        return entries.Select(e => new GrantAuditEntryDto
        {
            At = e.CreatedAt,
            ActorName = subjects.UserName(e.ActorUserId, "(system)"),
            Action = e.Action,
            SubjectType = e.SubjectType,
            SubjectName = e.SubjectType is { } subjectType ? subjects.Describe(subjectType, e.SubjectId).Name : null,
            OldLevel = e.OldLevel,
            NewLevel = e.NewLevel
        }).ToList();
    }
}
