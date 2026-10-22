namespace Reporting.Abstractions;

public class ResolvedToleranceBandDto
{
    /// <summary>Echoes ChartToleranceBand.Id so the client can key markLine styling per band.</summary>
    public string Id { get; set; } = string.Empty;
    public ChartAxis Axis { get; set; }

    /// <summary>Null when the referenced row/columns can't be resolved — the client skips this band.</summary>
    public double? Min { get; set; }
    public double? Max { get; set; }
    public double? ConcessionLower { get; set; }
    public double? ConcessionUpper { get; set; }

    /// <summary>Presentation flags echoed from the band config so the client can render without it.</summary>
    public bool Fill { get; set; }
    public bool OutlinePoints { get; set; }
}
