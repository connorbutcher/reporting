namespace Reporting.Abstractions;

/// <summary>Subject and level fields are null for inheritance changes.</summary>
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
