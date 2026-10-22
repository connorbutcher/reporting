namespace Reporting.DAL.Permissions;

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
