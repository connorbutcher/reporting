namespace Reporting.Database;

/// <summary>
/// An engineer's comment on a widget, while viewing a report. Keyed on the widget's stable
/// <see cref="Reporting.Database.Widget.RefId"/> rather than its row id, so a comment survives the
/// widget being copied into a new revision on publish/checkout — mirrors how <see cref="ReportViewState"/>
/// keys on the report rather than a version. <see cref="ReportId"/> is denormalized alongside it so a
/// report's comment counts can be queried in bulk without joining through tabs/revisions.
/// </summary>
public class WidgetComment
{
    public const int MaxBodyLength = 4_000;

    public int Id { get; set; }

    public Guid WidgetRefId { get; set; }

    public int ReportId { get; set; }

    public int AuthorUserId { get; set; }

    public string Body { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Where on a point chart this comment is pinned — a data coordinate, not a specific row, so it
    /// needs nothing from the chart's query pipeline beyond the value the reader clicked on. Null for
    /// a plain widget-level comment.
    /// </summary>
    public double? AnchorX { get; set; }
    public double? AnchorY { get; set; }

    /// <summary>Which Y axis the anchor's value reads against, for a chart with more than one.</summary>
    public int? AnchorYAxisIndex { get; set; }

    public List<WidgetCommentMention> Mentions { get; set; } = new();
}
