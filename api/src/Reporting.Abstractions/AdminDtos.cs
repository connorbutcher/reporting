namespace Reporting.Abstractions;

/// <summary>A user's reference, for listing group members and a user's memberships.</summary>
public class UserRefDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

/// <summary>A group's reference, for listing a user's memberships.</summary>
public class GroupRefDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

/// <summary>A user row for the admin list.</summary>
public class AdminUserDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    /// <summary>Seed-level super-admin flag; implies every app permission and is read-only in the admin UI.</summary>
    public bool IsGlobalAdmin { get; set; }

    /// <summary>Whether the user holds the <see cref="AppPermission.ManageUsers"/> permission directly or via a group.</summary>
    public bool CanManageUsers { get; set; }

    public int GroupCount { get; set; }
}

/// <summary>A user with the extra detail the edit dialog needs.</summary>
public class AdminUserDetailDto : AdminUserDto
{
    /// <summary>True when the ManageUsers permission is granted to the user directly (not only inherited from a group).</summary>
    public bool CanManageUsersDirect { get; set; }

    public List<GroupRefDto> Groups { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

/// <summary>Create or update a user. On update, the email is fixed as the identity and ignored.</summary>
public class SaveUserDto
{
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    /// <summary>Grants or revokes the ManageUsers app permission directly on this user.</summary>
    public bool CanManageUsers { get; set; }

    /// <summary>The RefIds of the groups the user should belong to (membership is set to exactly this).</summary>
    public List<Guid> GroupIds { get; set; } = new();
}

/// <summary>A group row for the admin list.</summary>
public class AdminGroupDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int MemberCount { get; set; }

    /// <summary>Whether the group holds the <see cref="AppPermission.ManageUsers"/> permission (given to all its members).</summary>
    public bool CanManageUsers { get; set; }
}

/// <summary>A group with its members and managers, for the detail card.</summary>
public class AdminGroupDetailDto : AdminGroupDto
{
    public List<UserRefDto> Members { get; set; } = new();

    /// <summary>The users delegated to manage this group (always a subset of <see cref="Members"/>).</summary>
    public List<UserRefDto> Managers { get; set; } = new();
}

/// <summary>Create or update a group.</summary>
public class SaveGroupDto
{
    public string Name { get; set; } = string.Empty;

    /// <summary>Grants or revokes the ManageUsers app permission on this group (full admins only; ignored for delegated managers).</summary>
    public bool CanManageUsers { get; set; }

    /// <summary>The RefIds of the users that should be members (membership is set to exactly this).</summary>
    public List<Guid> MemberIds { get; set; } = new();

    /// <summary>The RefIds of the users that should manage this group (must be a subset of <see cref="MemberIds"/>).</summary>
    public List<Guid> ManagerIds { get; set; } = new();
}

/// <summary>
/// The signed-in user's own identity and resolved app permissions. Unguarded — any caller may
/// learn who they are — and used by the client to show admin navigation and guard the admin route.
/// </summary>
public class CurrentUserDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsGlobalAdmin { get; set; }

    /// <summary>Every app permission the user holds (directly, via a group, or implied by global admin).</summary>
    public List<AppPermission> Permissions { get; set; } = new();

    /// <summary>Convenience flag mirroring <see cref="AppPermission.ManageUsers"/> in <see cref="Permissions"/> — full admin.</summary>
    public bool CanManageUsers { get; set; }

    /// <summary>Whether the user can reach the Groups section — a full admin, or a delegated manager of at least one group.</summary>
    public bool CanManageGroups { get; set; }
}
