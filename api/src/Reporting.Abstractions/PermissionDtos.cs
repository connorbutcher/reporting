namespace Reporting.Abstractions;

// --- subject pickers ---------------------------------------------------

public class UserDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsGlobalAdmin { get; set; }
}

public class UserGroupDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int MemberCount { get; set; }
}

// --- grants & permissions view ----------------------------------------

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

/// <summary>The permission state of one securable: its own grants, the resolved effective picture, and whether it inherits.</summary>
public class PermissionsDto
{
    public bool InheritsPermissions { get; set; }

    /// <summary>Grants set directly on this object.</summary>
    public List<AccessGrantDto> Explicit { get; set; } = new();

    /// <summary>The resolved "who can access, and why" view — this object's grants plus any it inherits. Read-only.</summary>
    public List<AccessGrantDto> Effective { get; set; } = new();
}

/// <summary>Adds or updates a grant, keyed by its subject (one grant per subject per object).</summary>
public class SaveGrantDto
{
    public GrantSubjectType SubjectType { get; set; }
    public Guid? SubjectId { get; set; }
    public AccessLevel Level { get; set; }
}

/// <summary>Removes the grant for a subject, if present.</summary>
public class RemoveGrantDto
{
    public GrantSubjectType SubjectType { get; set; }
    public Guid? SubjectId { get; set; }
}

/// <summary>Toggles whether an object inherits from its parent.</summary>
public class SetInheritanceDto
{
    public bool Inherits { get; set; }

    /// <summary>
    /// When breaking inheritance, first copy the currently-effective grants onto this object so
    /// no one (including the editor) loses access. Default true; pass false to start from a clean,
    /// potentially private, slate.
    /// </summary>
    public bool CopyDown { get; set; } = true;
}
