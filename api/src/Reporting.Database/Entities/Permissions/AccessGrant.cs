using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>An ACL entry. Exactly one typed FK matches each type column (none for Root/Everyone), enforced by CHECK constraints.</summary>
public class AccessGrant
{
    public int Id { get; set; }

    public SecurableType SecurableType { get; set; }

    public int? FolderId { get; set; }

    public int? ReportId { get; set; }

    public GrantSubjectType SubjectType { get; set; }

    public int? UserId { get; set; }

    public int? UserGroupId { get; set; }

    public AccessLevel Level { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>0 for system-seeded grants.</summary>
    public int CreatedByUserId { get; set; }
}
