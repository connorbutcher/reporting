namespace Reporting.Abstractions;

/// <summary>
/// The signed-in user's own identity and resolved app permissions. Unguarded — any caller may
/// learn who they are — and used by the client to show admin navigation and guard the admin route.
/// </summary>
public class CurrentUserDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsGlobalAdmin { get; set; }

    /// <summary>Every app permission the user holds (directly, via a group, or implied by global admin).</summary>
    public List<AppPermission> Permissions { get; set; } = new();

    /// <summary>Convenience flag mirroring <see cref="AppPermission.ManageUsers"/> in <see cref="Permissions"/> — full admin.</summary>
    public bool CanManageUsers { get; set; }

    /// <summary>Whether the user can reach the Groups section — a full admin, a delegated manager of at
    /// least one group, or a holder of <see cref="AppPermission.CreateGroups"/> (who may have none yet).</summary>
    public bool CanManageGroups { get; set; }

    /// <summary>Convenience flag mirroring <see cref="AppPermission.CreateGroups"/> in <see cref="Permissions"/> —
    /// whether the user can create a new group (and become its manager on creation).</summary>
    public bool CanCreateGroups { get; set; }
}
