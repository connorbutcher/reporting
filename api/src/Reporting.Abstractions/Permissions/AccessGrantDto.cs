namespace Reporting.Abstractions;

/// <summary>One grant, shaped for display and editing. Subjects are addressed by their RefId (null for Everyone).</summary>
public class AccessGrantDto
{
    public GrantSubjectType SubjectType { get; set; }

    /// <summary>The user's or group's RefId; null for <see cref="GrantSubjectType.Everyone"/>.</summary>
    public Guid? SubjectId { get; set; }

    /// <summary>Display label — the user/group name, or "Everyone".</summary>
    public string SubjectName { get; set; } = string.Empty;

    public AccessLevel Level { get; set; }

    /// <summary>True when this line comes from an ancestor rather than the object itself (effective view only).</summary>
    public bool Inherited { get; set; }

    /// <summary>The ancestor the inherited grant sits on, e.g. a folder name or "Root". Null when not inherited.</summary>
    public string? InheritedFrom { get; set; }
}
