namespace Reporting.DAL.Widgets;

/// <summary>One plotted point before its limits: its mean (or value), its dispersion (range, σ or moving range), and its size.</summary>
internal readonly record struct ControlChartPointStat(double Mean, double Dispersion, int Count, bool HasDispersion);
