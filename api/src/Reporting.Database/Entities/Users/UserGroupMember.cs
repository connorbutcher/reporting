namespace Reporting.Database;

public class UserGroupMember
{
    public int UserGroupId { get; set; }
    public UserGroup? UserGroup { get; set; }

    public int UserId { get; set; }
    public User? User { get; set; }
}
