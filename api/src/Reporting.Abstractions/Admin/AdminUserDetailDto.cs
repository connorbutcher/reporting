namespace Reporting.Abstractions;

/// <summary>A user with the extra detail the edit dialog needs.</summary>
public class AdminUserDetailDto : AdminUserDto
{
    public List<GroupRefDto> Groups { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}
