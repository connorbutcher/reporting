namespace Reporting.Abstractions;

/// <summary>A widget comment's author, by stable ref id — same shape <see cref="UserDto"/>'s id uses elsewhere.</summary>
public class WidgetCommentAuthorDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
}

public class WidgetCommentDto
{
    public int Id { get; set; }
    public WidgetCommentAuthorDto Author { get; set; } = new();
    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public double? AnchorX { get; set; }
    public double? AnchorY { get; set; }
    public int? AnchorYAxisIndex { get; set; }
    public List<WidgetCommentAuthorDto> Mentions { get; set; } = new();
    /// <summary>Whether the current user wrote it — the client's own delete affordance, rather than guessing from the author id.</summary>
    public bool IsOwn { get; set; }
}

public class CreateWidgetCommentDto
{
    public string Body { get; set; } = string.Empty;
    public double? AnchorX { get; set; }
    public double? AnchorY { get; set; }
    public int? AnchorYAxisIndex { get; set; }
    /// <summary>The ref ids of users named with `@` in <see cref="Body"/>.</summary>
    public List<Guid> MentionedUserIds { get; set; } = new();
}
