namespace Reporting.Abstractions;

/// <summary>
/// An application-wide capability, granted to a subject independently of the folder/report ACL.
/// Unlike <see cref="AccessLevel"/> these aren't a ladder — each is a discrete permission — and
/// they attach to the app as a whole, not to a securable. Global admins implicitly hold them all.
/// </summary>
public enum AppPermission
{
    /// <summary>The former <c>User.IsGlobalAdmin</c> column, now a grant like any other: bypasses the
    /// folder/report ACL entirely (resolves to Manager on everything — see
    /// <see cref="Reporting.DAL.Permissions.AccessResolver"/>) and implicitly holds every other app
    /// permission (see <see cref="Reporting.DAL.Permissions.AppPermissionService"/>).</summary>
    GlobalAdmin,

    /// <summary>Access to the Users section of the admin area: view/create/edit users. Group
    /// management is separate — driven by whether the user manages any group, not by this.</summary>
    ManageUsers,

    /// <summary>Lets the holder create new groups (in the Groups section of the admin area) even
    /// though they don't otherwise manage every group. The creator is automatically made that
    /// group's manager, unless they're a global admin — whose access is already implied.</summary>
    CreateGroups
}

/// <summary>Human-readable names for the app permissions, for the "requires X" messages a guard returns on 403.</summary>
public static class AppPermissions
{
    /// <summary>How a permission is named in an access-denied message, e.g. "the manage-users permission".</summary>
    public static string Describe(this AppPermission permission) => permission switch
    {
        AppPermission.GlobalAdmin => "global administrator status",
        AppPermission.ManageUsers => "the manage-users permission",
        AppPermission.CreateGroups => "the create-groups permission",
        _ => $"the {permission} permission"
    };
}
