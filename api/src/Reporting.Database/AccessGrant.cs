using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>
/// One entry in an access-control list: a subject (a user, a group, or everyone) is given a level
/// on a securable (a folder, a report, or the root scope). Both the securable and the subject are
/// discriminated unions: <see cref="SecurableType"/> / <see cref="SubjectType"/> says which kind,
/// and exactly one matching typed foreign key is set (none for the singleton Root/Everyone cases).
/// A database CHECK constraint enforces that pairing, and the foreign keys cascade — deleting a
/// folder, report, user, or group removes the grants that pointed at it. Effective access is
/// computed by walking a securable's inheritance chain and taking the max matching level.
/// </summary>
public class AccessGrant
{
    public int Id { get; set; }

    public SecurableType SecurableType { get; set; }

    /// <summary>Set when <see cref="SecurableType"/> is <see cref="SecurableType.Folder"/>; else null.</summary>
    public int? FolderId { get; set; }

    /// <summary>Set when <see cref="SecurableType"/> is <see cref="SecurableType.Report"/>; else null.</summary>
    public int? ReportId { get; set; }

    public GrantSubjectType SubjectType { get; set; }

    /// <summary>Set when <see cref="SubjectType"/> is <see cref="GrantSubjectType.User"/>; else null.</summary>
    public int? UserId { get; set; }

    /// <summary>Set when <see cref="SubjectType"/> is <see cref="GrantSubjectType.Group"/>; else null.</summary>
    public int? UserGroupId { get; set; }

    public AccessLevel Level { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>The user who created the grant. 0 for grants seeded by the system.</summary>
    public int CreatedByUserId { get; set; }
}
