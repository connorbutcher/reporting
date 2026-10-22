namespace Reporting.Abstractions;

public class SaveGroupDto
{
    public string Name { get; set; } = string.Empty;

    /// <summary>User RefIds; membership is set to exactly this.</summary>
    public List<Guid> MemberIds { get; set; } = new();

    /// <summary>User RefIds; must be a subset of <see cref="MemberIds"/>.</summary>
    public List<Guid> ManagerIds { get; set; } = new();
}
