namespace Reporting.Abstractions;

/// <summary><see cref="Filters"/> is null for a stale link, still returned as a 200.</summary>
public class ReportSharedViewDto
{
    public string Id { get; set; } = string.Empty;
    public string? Filters { get; set; }
}
