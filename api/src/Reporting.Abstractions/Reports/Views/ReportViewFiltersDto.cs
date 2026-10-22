namespace Reporting.Abstractions;

/// <summary>The client's opaque filter encoding; null when none.</summary>
public class ReportViewFiltersDto
{
    public string? Filters { get; set; }
}
