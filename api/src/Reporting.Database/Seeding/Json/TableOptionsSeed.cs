namespace Reporting.Database;

/// <summary>The reader-facing table options; the defaults match a new table in the builder.</summary>
internal sealed record TableOptionsSeed(
    bool ShowTotals = false, bool ShowSearch = false, int FrozenColumns = 0, bool RowDetails = true,
    bool Paginator = false, int RowsPerPage = 10, string? SortColumnName = null, string SortDirection = "asc",
    string FilterJson = "null", int? DatasetIdOverride = null);
