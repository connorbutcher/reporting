using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>
/// Grants one <see cref="AppPermission"/> to a single user. Unlike <see cref="AccessGrant"/> the
/// subject is always a user — app permissions can't be granted to a group (that would escalate
/// every member) or to Everyone — and there is no securable: app permissions attach to the
/// application as a whole. The foreign key cascades, so deleting a user removes their grants.
/// </summary>
public class AppPermissionGrant
{
    public int Id { get; set; }

    public AppPermission Permission { get; set; }

    /// <summary>The user the permission is granted to.</summary>
    public int UserId { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>The user who created the grant. 0 for grants seeded by the system.</summary>
    public int CreatedByUserId { get; set; }
}
