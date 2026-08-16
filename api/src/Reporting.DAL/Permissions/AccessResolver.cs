using Reporting.Abstractions;

namespace Reporting.DAL.Permissions;

/// <summary>One grant reduced to what resolution needs: who it targets and the level it gives.</summary>
public sealed record GrantLine(GrantSubjectType SubjectType, int? SubjectId, AccessLevel Level);

/// <summary>
/// A securable and its grants, linked to the parent it inherits from — the chain the
/// resolver walks from the target up toward the root. <see cref="PermissionService"/>
/// builds these from the database; tests build them by hand.
/// </summary>
/// <param name="InheritsPermissions">
/// When false the walk stops here: neither the parent nor anything above it (including the
/// open root baseline) contributes, so this node and its subtree can be more restrictive
/// than their ancestors.
/// </param>
public sealed record SecurableNode(
    bool InheritsPermissions,
    IReadOnlyList<GrantLine> Grants,
    SecurableNode? Parent);

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
        if (user.IsGlobalAdmin) return AccessLevel.Manager;

        var best = AccessLevel.None;
        for (var current = node; current is not null; current = current.Parent)
        {
            foreach (var grant in current.Grants)
            {
                if (grant.Level > best && Matches(grant, user)) best = grant.Level;
            }

            // Manager is the ceiling — nothing higher up can raise it further.
            if (best == AccessLevel.Manager) break;

            // A broken link cuts the chain: don't consult the parent (or the root baseline).
            if (!current.InheritsPermissions) break;
        }

        return best;
    }

    private static bool Matches(GrantLine grant, ICurrentUser user) => grant.SubjectType switch
    {
        GrantSubjectType.Everyone => true,
        GrantSubjectType.User => grant.SubjectId == user.Id,
        GrantSubjectType.Group => grant.SubjectId is { } id && user.GroupIds.Contains(id),
        _ => false
    };
}
