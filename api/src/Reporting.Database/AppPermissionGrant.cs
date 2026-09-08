using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>
/// Grants one <see cref="AppPermission"/> to a subject (a user or a group). Like
/// <see cref="AccessGrant"/> the subject is a discriminated union — <see cref="SubjectType"/> says
/// which kind and exactly one matching typed foreign key is set, enforced by a CHECK constraint —
/// but there is no securable: app permissions attach to the application as a whole, and Everyone is
/// not a valid subject. The foreign keys cascade, so deleting a user or group removes their grants.
/// </summary>
public class AppPermissionGrant
{
    public int Id { get; set; }

    public AppPermission Permission { get; set; }

    /// <summary>Only <see cref="GrantSubjectType.User"/> or <see cref="GrantSubjectType.Group"/>.</summary>
    public GrantSubjectType SubjectType { get; set; }

    /// <summary>Set when <see cref="SubjectType"/> is <see cref="GrantSubjectType.User"/>; else null.</summary>
    public int? UserId { get; set; }

    /// <summary>Set when <see cref="SubjectType"/> is <see cref="GrantSubjectType.Group"/>; else null.</summary>
    public int? UserGroupId { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>The user who created the grant. 0 for grants seeded by the system.</summary>
    public int CreatedByUserId { get; set; }
}
