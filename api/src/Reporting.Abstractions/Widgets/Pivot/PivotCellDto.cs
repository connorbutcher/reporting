namespace Reporting.Abstractions;

public class PivotCellDto
{
    /// <summary>A fraction for a percentage; null where the group had nothing to reduce.</summary>
    public double? Value { get; set; }

    public string? DisplayValue { get; set; }
}
