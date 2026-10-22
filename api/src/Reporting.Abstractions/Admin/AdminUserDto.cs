namespace Reporting.Abstractions;

public class AdminUserDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    /// <summary>Read-only in the admin UI; there's no self-service way to grant or revoke it.</summary>
    public bool IsGlobalAdmin { get; set; }

    /// <summary>Granted directly to the user.</summary>
    public bool CanManageUsers { get; set; }

    /// <summary>Granted directly or implied by <see cref="IsGlobalAdmin"/>.</summary>
    public bool CanCreateGroups { get; set; }

    public int GroupCount { get; set; }
}
