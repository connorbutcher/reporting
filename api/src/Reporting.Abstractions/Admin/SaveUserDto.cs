namespace Reporting.Abstractions;

/// <summary>Create or update a user. On update, the email is fixed as the identity and ignored.</summary>
public class SaveUserDto
{
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    /// <summary>Grants or revokes the ManageUsers app permission directly on this user.</summary>
    public bool CanManageUsers { get; set; }

    /// <summary>Grants or revokes the CreateGroups app permission directly on this user.</summary>
    public bool CanCreateGroups { get; set; }

    /// <summary>The RefIds of the groups the user should belong to (membership is set to exactly this).</summary>
    public List<Guid> GroupIds { get; set; } = new();
}
