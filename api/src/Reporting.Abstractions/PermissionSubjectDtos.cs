namespace Reporting.Abstractions;

public class UserDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsGlobalAdmin { get; set; }
}

public class UserGroupDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int MemberCount { get; set; }
}
