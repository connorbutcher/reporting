namespace Reporting.Database;

public class UserGroup
{
    public int Id { get; set; }

    public Guid RefId { get; set; }

    public string Name { get; set; } = string.Empty;

    public List<UserGroupMember> Members { get; set; } = new();

    /// <summary>A subset of its members.</summary>
    public List<UserGroupManager> Managers { get; set; } = new();
}
