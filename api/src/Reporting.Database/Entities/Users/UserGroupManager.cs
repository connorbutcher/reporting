namespace Reporting.Database;

/// <summary>
/// Join row appointing a <see cref="User"/> as a manager of a <see cref="UserGroup"/> — a delegated
/// role that lets them administer just that group (its membership, name, managers, and deletion)
/// without full admin rights. Composite key (UserGroupId, UserId); both sides cascade, so the row
/// is removed with either the group or the user.
/// </summary>
public class UserGroupManager
{
    public int UserGroupId { get; set; }
    public UserGroup? UserGroup { get; set; }

    public int UserId { get; set; }
    public User? User { get; set; }
}
