using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>
/// One entry in an access-control list: a subject (a user, a group, or everyone)
/// is given a level on a securable (a folder, a report, or the root scope).
/// Both the securable and the subject are loose polymorphic references — there is
/// no FK, since the target table depends on the type discriminator — matching how
/// cells reference their column. Effective access is computed by walking a
/// securable's inheritance chain and taking the max matching level.
/// </summary>
public class AccessGrant
{
    public int Id { get; set; }

    public SecurableType SecurableType { get; set; }

    /// <summary>The securable's <c>Id</c>; null for the singleton <see cref="SecurableType.Root"/> scope.</summary>
    public int? SecurableId { get; set; }

    public GrantSubjectType SubjectType { get; set; }

    /// <summary>The user's or group's <c>Id</c>; null for <see cref="GrantSubjectType.Everyone"/>.</summary>
    public int? SubjectId { get; set; }

    public AccessLevel Level { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>The user who created the grant. 0 for grants seeded by the system.</summary>
    public int CreatedByUserId { get; set; }
}
