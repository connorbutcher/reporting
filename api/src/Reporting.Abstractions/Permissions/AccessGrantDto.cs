namespace Reporting.Abstractions;

public class AccessGrantDto
{
    public GrantSubjectType SubjectType { get; set; }

    /// <summary>User or group RefId; null for <see cref="GrantSubjectType.Everyone"/>.</summary>
    public Guid? SubjectId { get; set; }

    public string SubjectName { get; set; } = string.Empty;

    public AccessLevel Level { get; set; }

    /// <summary>Effective view only: the grant comes from an ancestor.</summary>
    public bool Inherited { get; set; }

    /// <summary>e.g. a folder name or "Root".</summary>
    public string? InheritedFrom { get; set; }
}
