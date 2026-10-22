namespace Reporting.Abstractions;

public class AdminGroupDetailDto : AdminGroupDto
{
    public List<UserRefDto> Members { get; set; } = new();

    /// <summary>Always a subset of <see cref="Members"/>.</summary>
    public List<UserRefDto> Managers { get; set; } = new();
}
