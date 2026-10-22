namespace Reporting.Abstractions;

public class PermissionsDto
{
    public bool InheritsPermissions { get; set; }

    public List<AccessGrantDto> Explicit { get; set; } = new();

    /// <summary>This object's grants plus any it inherits. Read-only.</summary>
    public List<AccessGrantDto> Effective { get; set; } = new();
}
