using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>Always to a single user: granting to a group or Everyone would escalate every member.</summary>
public class AppPermissionGrant
{
    public int Id { get; set; }

    public AppPermission Permission { get; set; }

    public int UserId { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>0 for system-seeded grants.</summary>
    public int CreatedByUserId { get; set; }
}
