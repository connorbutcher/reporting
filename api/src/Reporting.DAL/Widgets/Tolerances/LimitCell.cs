namespace Reporting.DAL.Widgets;

/// <summary>One cell of a limits dataset, read whole to index its rows by identifier.</summary>
internal sealed record LimitCell(int RowId, int ColumnId, string? StringValue, double? NumberValue, DateTime? DateValue);
