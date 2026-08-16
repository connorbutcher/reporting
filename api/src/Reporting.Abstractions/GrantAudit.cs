namespace Reporting.Abstractions;

/// <summary>What changed about a securable's permissions, for the audit trail.</summary>
public enum GrantAuditAction
{
    GrantAdded,
    GrantUpdated,
    GrantRemoved,
    InheritanceEnabled,
    InheritanceDisabled
}

/// <summary>One audit-trail entry: who changed what, when. Subject/level fields are null for inheritance changes.</summary>
public class GrantAuditEntryDto
{
    public DateTime At { get; set; }
    public string ActorName { get; set; } = string.Empty;
    public GrantAuditAction Action { get; set; }

    public GrantSubjectType? SubjectType { get; set; }
    public string? SubjectName { get; set; }

    public AccessLevel? OldLevel { get; set; }
    public AccessLevel? NewLevel { get; set; }
}
