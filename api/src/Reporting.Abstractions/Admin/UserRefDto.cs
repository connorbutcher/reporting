namespace Reporting.Abstractions;

/// <summary>A user's reference, for listing group members and a user's memberships.</summary>
public class UserRefDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}
