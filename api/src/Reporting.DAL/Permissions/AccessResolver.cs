using Reporting.Abstractions;

namespace Reporting.DAL.Permissions;

/// <summary>
/// The heart of the permission system: a user's effective level on a securable is the
/// highest level any grant for the user, one of their groups, or "everyone" gives on the
/// node or an ancestor it still inherits from. Pure and side-effect free so the whole
/// model can be exercised against hand-built trees.
/// </summary>
public static class AccessResolver
{
    public static AccessLevel Resolve(ICurrentUser user, SecurableNode node)
    {
        // A global admin sees everything as a Manager, regardless of any grant.
        if (user.IsGlobalAdmin)
        {
            return AccessLevel.Manager;
        }

        var best = AccessLevel.None;
        for (var current = node; current is not null; current = current.Parent)
        {
            foreach (var grant in current.Grants)
            {
                if (grant.Level > best && Matches(grant, user))
                {
                    best = grant.Level;
                }
            }

            // Manager is the ceiling — nothing higher up can raise it further.
            if (best == AccessLevel.Manager)
            {
                break;
            }

            // A broken link cuts the chain: don't consult the parent (or the root baseline).
            if (!current.InheritsPermissions)
            {
                break;
            }
        }

        return best;
    }

    private static bool Matches(GrantLine grant, ICurrentUser user)
    {
        return grant.SubjectType switch
        {
            GrantSubjectType.Everyone => true,
            GrantSubjectType.User => grant.SubjectId == user.Id,
            GrantSubjectType.Group => grant.SubjectId is { } id && user.GroupIds.Contains(id),
            _ => false
        };
    }
}
