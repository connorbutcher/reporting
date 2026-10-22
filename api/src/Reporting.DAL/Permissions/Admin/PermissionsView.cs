using Reporting.Abstractions;

namespace Reporting.DAL.Permissions;

/// <summary>The grants set directly on a chain's leaf, and what every subject effectively gets there and from where.</summary>
internal static class PermissionsView
{
    public static PermissionsDto Build(List<ChainNode> chain, List<SecurableGrant> grants, SubjectDirectory subjects, bool inheritsPermissions)
    {
        var leaf = chain[0];
        var explicitGrants = grants
            .Where(g => g.SecurableType == leaf.Type && g.SecurableId == leaf.Id)
            .Select(g => ToDto(subjects, g.SubjectType, g.SubjectId, g.Level, inherited: false, from: null))
            .OrderByDescending(d => d.Level).ThenBy(d => d.SubjectName)
            .ToList();

        var effective = PermissionChain.Effective(chain, grants)
            .Select(e => EffectiveToDto(subjects, leaf, e.Key, e.Value))
            .OrderByDescending(d => d.Level).ThenBy(d => d.SubjectName)
            .ToList();

        return new PermissionsDto
        {
            InheritsPermissions = inheritsPermissions,
            Explicit = explicitGrants,
            Effective = effective
        };
    }

    private static AccessGrantDto EffectiveToDto(
        SubjectDirectory subjects, ChainNode leaf, (GrantSubjectType Type, int? Id) subject, EffectiveGrant grant)
    {
        var inherited = grant.Source != leaf;
        return ToDto(subjects, subject.Type, subject.Id, grant.Level, inherited, inherited ? grant.Source.Name : null);
    }

    private static AccessGrantDto ToDto(
        SubjectDirectory subjects, GrantSubjectType type, int? id, AccessLevel level, bool inherited, string? from)
    {
        var (subjectRef, name) = subjects.Describe(type, id);
        return new AccessGrantDto
        {
            SubjectType = type,
            SubjectId = subjectRef,
            SubjectName = name,
            Level = level,
            Inherited = inherited,
            InheritedFrom = from
        };
    }
}
