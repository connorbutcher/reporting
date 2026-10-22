namespace Reporting.Abstractions;

/// <summary>On update the email is the fixed identity and is ignored.</summary>
public class SaveUserDto
{
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    public bool CanManageUsers { get; set; }

    public bool CanCreateGroups { get; set; }

    /// <summary>Group RefIds; membership is set to exactly this.</summary>
    public List<Guid> GroupIds { get; set; } = new();
}
