namespace Reporting.Database;

/// <summary>Keyed on the widget's RefId so it survives version copies. ReportId is denormalized for bulk counts.</summary>
public class WidgetComment
{
    public const int MaxBodyLength = 4_000;

    public int Id { get; set; }

    public Guid WidgetRefId { get; set; }

    public int ReportId { get; set; }

    public int AuthorUserId { get; set; }

    public string Body { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    /// <summary>A data coordinate on a point chart; null for a widget-level comment.</summary>
    public double? AnchorX { get; set; }
    public double? AnchorY { get; set; }

    public int? AnchorYAxisIndex { get; set; }

    public List<WidgetCommentMention> Mentions { get; set; } = new();
}
