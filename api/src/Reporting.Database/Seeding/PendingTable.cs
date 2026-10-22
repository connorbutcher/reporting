namespace Reporting.Database;

/// <summary>A data table whose config is written once its dataset has a database id.</summary>
internal sealed record PendingTable(Widget Widget, Dataset Dataset, string Title, string[] ColumnNames);
