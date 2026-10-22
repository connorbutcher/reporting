namespace Reporting.Abstractions;

/// <summary>The user's saved viewing filters as the front-end's opaque encoding; null when none (still a 200).</summary>
public class ReportViewFiltersDto
{
    public string? Filters { get; set; }
}
