namespace Reporting.Abstractions;

/// <summary>A least-squares fit; (X1, Y1) and (X2, Y2) are its ends at the series' min and max X.</summary>
public class TrendLineDto
{
    public double X1 { get; set; }
    public double Y1 { get; set; }
    public double X2 { get; set; }
    public double Y2 { get; set; }
    public double Slope { get; set; }
    public double Intercept { get; set; }

    public double RSquared { get; set; }
}
