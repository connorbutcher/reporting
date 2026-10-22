namespace Reporting.Abstractions;

/// <summary>A group's reference, for listing a user's memberships.</summary>
public class GroupRefDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}
