namespace Reporting.Abstractions;

/// <summary>The permission state of one securable: its own grants, the resolved effective picture, and whether it inherits.</summary>
public class PermissionsDto
{
    public bool InheritsPermissions { get; set; }

    /// <summary>Grants set directly on this object.</summary>
    public List<AccessGrantDto> Explicit { get; set; } = new();

    /// <summary>The resolved "who can access, and why" view — this object's grants plus any it inherits. Read-only.</summary>
    public List<AccessGrantDto> Effective { get; set; } = new();
}
