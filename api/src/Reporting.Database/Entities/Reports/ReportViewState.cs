namespace Reporting.Database;

/// <summary>A user's saved viewing filters. Keyed on the report so they carry across versions.</summary>
public class ReportViewState
{
    public const int MaxFiltersLength = 32_000;

    public int Id { get; set; }

    public int UserId { get; set; }

    public int ReportId { get; set; }

    /// <summary>Opaque to the server.</summary>
    public string Filters { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; }
}
