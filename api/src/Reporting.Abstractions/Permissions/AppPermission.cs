namespace Reporting.Abstractions;

/// <summary>An app-wide capability, independent of the folder/report ACL. Not a ladder.</summary>
public enum AppPermission
{
    /// <summary>Manager on every securable, and implies every other app permission.</summary>
    GlobalAdmin,

    /// <summary>The admin Users section. Group management is driven by managing a group instead.</summary>
    ManageUsers,

    /// <summary>The creator becomes the new group's manager, unless they're a global admin.</summary>
    CreateGroups
}
