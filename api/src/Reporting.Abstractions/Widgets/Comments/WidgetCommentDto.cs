namespace Reporting.Abstractions;

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
    /// <summary>Written by the current user.</summary>
    public bool IsOwn { get; set; }
}
