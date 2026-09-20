namespace Reporting.Abstractions;

/// <summary>The user's saved viewing filters as the front-end's opaque encoding; null when none (still a 200).</summary>
public class ReportViewFiltersDto
{
    public string? Filters { get; set; }
}

public class SaveReportViewFiltersDto
{
    public string Filters { get; set; } = string.Empty;
}

/// <summary>A shared filter snapshot by its short id. <see cref="Filters"/> is null when the report has none (a 200, so a stale link is explained, not an error).</summary>
public class ReportSharedViewDto
{
    public string Id { get; set; } = string.Empty;
    public string? Filters { get; set; }
}
