namespace Reporting.Abstractions;

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
