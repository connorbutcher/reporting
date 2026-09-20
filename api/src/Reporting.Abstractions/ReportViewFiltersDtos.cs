namespace Reporting.Abstractions;

/// <summary>
/// The current user's saved viewing filters for a report. <see cref="Filters"/> is the front-end's
/// compact encoding of what they changed from the published filters, opaque to the server; null when
/// they have nothing saved (a 200, not a 404, so opening a report never looks like a failed load).
/// </summary>
public class ReportViewFiltersDto
{
    public string? Filters { get; set; }
}

public class SaveReportViewFiltersDto
{
    public string Filters { get; set; } = string.Empty;
}

/// <summary>
/// A shared filter snapshot, addressed by the short <see cref="Id"/> a link carries. <see cref="Filters"/>
/// is the front-end's opaque encoding; null when no such snapshot exists for the report (a 200, not a
/// 404, so a stale link is something the viewer explains rather than a failed request).
/// </summary>
public class ReportSharedViewDto
{
    public string Id { get; set; } = string.Empty;
    public string? Filters { get; set; }
}
