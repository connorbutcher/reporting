namespace Reporting.DAL.Widgets;

/// <summary>A tolerance band's four bounds, resolved to concrete numbers.</summary>
public record ToleranceBounds(double Min, double Max, double? ConcessionLower, double? ConcessionUpper);
