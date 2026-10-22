namespace Reporting.Abstractions;

public class ResolvedToleranceBandDto
{
    /// <summary>Echoes <see cref="ChartToleranceBand.Id"/>.</summary>
    public string Id { get; set; } = string.Empty;
    public ChartAxis Axis { get; set; }

    /// <summary>Null when the referenced row or columns can't be resolved.</summary>
    public double? Min { get; set; }
    public double? Max { get; set; }
    public double? ConcessionLower { get; set; }
    public double? ConcessionUpper { get; set; }

    public bool Fill { get; set; }
    public bool OutlinePoints { get; set; }
}
