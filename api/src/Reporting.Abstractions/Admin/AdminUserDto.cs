namespace Reporting.Abstractions;

/// <summary>A user row for the admin list.</summary>
public class AdminUserDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    /// <summary>Whether the user holds the <see cref="AppPermission.GlobalAdmin"/> grant; implies every
    /// other app permission and full ACL access, and is read-only in the admin UI (there's no
    /// self-service way to grant or revoke it).</summary>
    public bool IsGlobalAdmin { get; set; }

    /// <summary>Whether the user holds the <see cref="AppPermission.ManageUsers"/> permission (granted directly to them).</summary>
    public bool CanManageUsers { get; set; }

    /// <summary>Whether the user holds the <see cref="AppPermission.CreateGroups"/> permission (directly, or
    /// implied by <see cref="IsGlobalAdmin"/>) — lets them create new groups even without managing any yet.</summary>
    public bool CanCreateGroups { get; set; }

    public int GroupCount { get; set; }
}
