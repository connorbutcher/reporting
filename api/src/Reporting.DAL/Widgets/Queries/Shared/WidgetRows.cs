using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>A dataset's rows after its mandatory filter, the subset a widget's own filter matches, and both counts.</summary>
public sealed record WidgetRows(IQueryable<DatasetRow> All, IQueryable<DatasetRow> Matching, int TotalRowCount, int MatchedRowCount);
