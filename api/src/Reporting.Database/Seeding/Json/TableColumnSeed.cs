namespace Reporting.Database;

/// <summary>A table column by dataset column name, with its optional totals, data bars, highlighting and banding.</summary>
internal sealed record TableColumnSeed(
    string Name, string? Total = null, bool DataBars = false, string FormatRulesJson = "[]",
    string ToleranceJson = "null", bool Wrap = false, string? Header = null);
