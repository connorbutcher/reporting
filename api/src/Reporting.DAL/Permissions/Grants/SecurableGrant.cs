using Reporting.Abstractions;

namespace Reporting.DAL.Permissions;

/// <summary>A grant with its typed foreign keys folded back to (type, id) pairs.</summary>
internal sealed record SecurableGrant(
    SecurableType SecurableType, int? SecurableId, GrantSubjectType SubjectType, int? SubjectId, AccessLevel Level)
{
    public GrantLine ToLine()
    {
        return new GrantLine(SubjectType, SubjectId, Level);
    }
}
