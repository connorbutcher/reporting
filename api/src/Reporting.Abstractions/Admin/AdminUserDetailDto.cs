namespace Reporting.Abstractions;

public class AdminUserDetailDto : AdminUserDto
{
    public List<GroupRefDto> Groups { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}
