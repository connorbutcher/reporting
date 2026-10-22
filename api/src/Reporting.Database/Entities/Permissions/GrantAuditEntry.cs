using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>Append-only. Inheritance toggles have no subject or levels.</summary>
public class GrantAuditEntry
{
    public int Id { get; set; }

    public SecurableType SecurableType { get; set; }
    public int? SecurableId { get; set; }

    public GrantAuditAction Action { get; set; }

    public GrantSubjectType? SubjectType { get; set; }
    public int? SubjectId { get; set; }

    public AccessLevel? OldLevel { get; set; }
    public AccessLevel? NewLevel { get; set; }

    public int ActorUserId { get; set; }

    public DateTime CreatedAt { get; set; }
}
