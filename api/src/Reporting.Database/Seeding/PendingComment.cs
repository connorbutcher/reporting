namespace Reporting.Database;

/// <summary>
/// A widget comment written once its report has an id. Users are found by email and the comment is skipped
/// when its author doesn't exist. <paramref name="AnchorX"/> and <paramref name="AnchorY"/> pin it to a point on a chart.
/// </summary>
internal sealed record PendingComment(
    Report Report, Guid WidgetRef, string AuthorEmail, string Body, string[] MentionEmails, int HoursAgo,
    double? AnchorX = null, double? AnchorY = null);
