namespace Reporting.Abstractions;

/// <summary>
/// An application-wide capability, granted to a subject independently of the folder/report ACL.
/// Unlike <see cref="AccessLevel"/> these aren't a ladder — each is a discrete permission — and
/// they attach to the app as a whole, not to a securable. Global admins implicitly hold them all.
/// </summary>
public enum AppPermission
{
    /// <summary>Access to the admin area: view/create/edit users and view/create/edit/delete groups.</summary>
    ManageUsers
}

/// <summary>Human-readable names for the app permissions, for the "requires X" messages a guard returns on 403.</summary>
public static class AppPermissions
{
    /// <summary>How a permission is named in an access-denied message, e.g. "the manage-users permission".</summary>
    public static string Describe(this AppPermission permission) => permission switch
    {
        AppPermission.ManageUsers => "the manage-users permission",
        _ => $"the {permission} permission"
    };
}
