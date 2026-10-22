namespace Reporting.Abstractions;

/// <summary>The signed-in user and their resolved app permissions. Unguarded: any caller may learn who they are.</summary>
public class CurrentUserDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsGlobalAdmin { get; set; }

    /// <summary>Held directly, via a group, or implied by global admin.</summary>
    public List<AppPermission> Permissions { get; set; } = new();

    public bool CanManageUsers { get; set; }

    /// <summary>A full admin, a manager of at least one group, or a holder of <see cref="AppPermission.CreateGroups"/>.</summary>
    public bool CanManageGroups { get; set; }

    public bool CanCreateGroups { get; set; }
}
