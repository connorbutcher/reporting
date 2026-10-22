namespace Reporting.Abstractions;

/// <summary>Create or update a group.</summary>
public class SaveGroupDto
{
    public string Name { get; set; } = string.Empty;

    /// <summary>The RefIds of the users that should be members (membership is set to exactly this).</summary>
    public List<Guid> MemberIds { get; set; } = new();

    /// <summary>The RefIds of the users that should manage this group (must be a subset of <see cref="MemberIds"/>).</summary>
    public List<Guid> ManagerIds { get; set; } = new();
}
