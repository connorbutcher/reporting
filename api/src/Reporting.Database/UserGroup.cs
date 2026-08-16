namespace Reporting.Database;

/// <summary>A named set of users that can be granted access as a unit.</summary>
public class UserGroup
{
    public int Id { get; set; }

    /// <summary>Stable external/reference id, exposed through the API.</summary>
    public Guid RefId { get; set; }

    public string Name { get; set; } = string.Empty;

    public List<UserGroupMember> Members { get; set; } = new();
}
