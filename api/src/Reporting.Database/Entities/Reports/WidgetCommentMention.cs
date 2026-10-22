namespace Reporting.Database;

/// <summary>A user named with `@` in a <see cref="WidgetComment"/>, so they can be looked up without reparsing the body.</summary>
public class WidgetCommentMention
{
    public int Id { get; set; }

    public int CommentId { get; set; }

    public int UserId { get; set; }
}
