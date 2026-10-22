namespace Reporting.Database;

/// <summary>Lets a user administer just this group without full admin rights.</summary>
public class UserGroupManager
{
    public int UserGroupId { get; set; }
    public UserGroup? UserGroup { get; set; }

    public int UserId { get; set; }
    public User? User { get; set; }
}
