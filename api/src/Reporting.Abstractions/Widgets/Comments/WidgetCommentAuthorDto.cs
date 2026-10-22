namespace Reporting.Abstractions;

/// <summary>A widget comment's author, by stable ref id — same shape <see cref="UserDto"/>'s id uses elsewhere.</summary>
public class WidgetCommentAuthorDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
}
