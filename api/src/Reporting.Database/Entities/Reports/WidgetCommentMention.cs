namespace Reporting.Database;

/// <summary>An @-mention, stored so it can be found without reparsing the body.</summary>
public class WidgetCommentMention
{
    public int Id { get; set; }

    public int CommentId { get; set; }

    public int UserId { get; set; }
}
