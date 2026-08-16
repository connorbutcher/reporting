namespace Reporting.Database;

/// <summary>
/// A person who can be granted access. Until authentication is wired up the app
/// runs as a single seeded default user; the columns here are what a real identity
/// provider will later fill from its claims.
/// </summary>
public class User
{
    public int Id { get; set; }

    /// <summary>Stable external/reference id, exposed through the API and used to look up the current user.</summary>
    public Guid RefId { get; set; }

    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>Bypasses the ACL entirely — resolves to <see cref="Reporting.Abstractions.AccessLevel.Manager"/> on everything.</summary>
    public bool IsGlobalAdmin { get; set; }

    public DateTime CreatedAt { get; set; }

    public List<UserGroupMember> Memberships { get; set; } = new();
}
