namespace Reporting.Abstractions;

public class CreateWidgetCommentDto
{
    public string Body { get; set; } = string.Empty;
    public double? AnchorX { get; set; }
    public double? AnchorY { get; set; }
    public int? AnchorYAxisIndex { get; set; }
    /// <summary>Users @-mentioned in <see cref="Body"/>.</summary>
    public List<Guid> MentionedUserIds { get; set; } = new();
}
