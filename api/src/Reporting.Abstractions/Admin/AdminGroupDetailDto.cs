namespace Reporting.Abstractions;

/// <summary>A group with its members and managers, for the detail card.</summary>
public class AdminGroupDetailDto : AdminGroupDto
{
    public List<UserRefDto> Members { get; set; } = new();

    /// <summary>The users delegated to manage this group (always a subset of <see cref="Members"/>).</summary>
    public List<UserRefDto> Managers { get; set; } = new();
}
