namespace Reporting.Abstractions;

/// <summary>
/// A series' linear trend: the two endpoints the client draws a line through (its fitted Y at the
/// series' min and max X), plus the fit's own slope/intercept/R² should the client want to show them.
/// </summary>
public class TrendLineDto
{
    public double X1 { get; set; }
    public double Y1 { get; set; }
    public double X2 { get; set; }
    public double Y2 { get; set; }
    public double Slope { get; set; }
    public double Intercept { get; set; }

    /// <summary>The coefficient of determination (0..1) — how well the line fits the series' points.</summary>
    public double RSquared { get; set; }
}
