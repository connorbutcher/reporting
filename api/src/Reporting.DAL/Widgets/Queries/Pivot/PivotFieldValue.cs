namespace Reporting.DAL.Widgets;

/// <summary>A row or column field's reading of one cell: what it shows, how it sorts, and the period it falls in when grouped.</summary>
public readonly record struct PivotFieldValue(string Display, object? SortKey, DateTime? PeriodStart, DateTime? PeriodEnd);
