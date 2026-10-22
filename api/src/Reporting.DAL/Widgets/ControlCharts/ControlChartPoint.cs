namespace Reporting.DAL.Widgets;

/// <summary>One plotted point: its value, its centre line, and its control limits. A null value isn't plotted.</summary>
public readonly record struct ControlChartPoint(double? Value, double Center, double Upper, double Lower);
