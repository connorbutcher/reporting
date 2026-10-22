namespace Reporting.Database;

/// <summary>Until authentication is wired up the app runs as one seeded default user.</summary>
public class User
{
    public int Id { get; set; }

    public Guid RefId { get; set; }

    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public List<UserGroupMember> Memberships { get; set; } = new();
}
