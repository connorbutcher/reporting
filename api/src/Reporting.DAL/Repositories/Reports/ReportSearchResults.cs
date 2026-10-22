using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>The reports matching a search, each paired with its "Home / …" folder path, before visibility filtering.</summary>
public sealed record ReportSearchResults(List<Report> Matches, IReadOnlyDictionary<int, string> PathByReportId);
