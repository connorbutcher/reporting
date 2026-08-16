using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>
/// An append-only record of a permission change on a securable: who did it, to which subject,
/// and the level before and after. Inheritance toggles are recorded with no subject or levels.
/// Like <see cref="AccessGrant"/> the securable and subject are loose polymorphic references.
/// </summary>
public class GrantAuditEntry
{
    public int Id { get; set; }

    public SecurableType SecurableType { get; set; }
    public int? SecurableId { get; set; }

    public GrantAuditAction Action { get; set; }

    /// <summary>The subject whose grant changed; null for inheritance actions.</summary>
    public GrantSubjectType? SubjectType { get; set; }
    public int? SubjectId { get; set; }

    public AccessLevel? OldLevel { get; set; }
    public AccessLevel? NewLevel { get; set; }

    /// <summary>The user who made the change.</summary>
    public int ActorUserId { get; set; }

    public DateTime CreatedAt { get; set; }
}
