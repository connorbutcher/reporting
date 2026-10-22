namespace Reporting.Database;

/// <summary>Join row placing a <see cref="User"/> in a <see cref="UserGroup"/>. Composite key (GroupId, UserId).</summary>
public class UserGroupMember
{
    public int UserGroupId { get; set; }
    public UserGroup? UserGroup { get; set; }

    public int UserId { get; set; }
    public User? User { get; set; }
}
