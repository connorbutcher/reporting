namespace Reporting.Abstractions;

/// <summary>A group row for the admin list.</summary>
public class AdminGroupDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int MemberCount { get; set; }
}
