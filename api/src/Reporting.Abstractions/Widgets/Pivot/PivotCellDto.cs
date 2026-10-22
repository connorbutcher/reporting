namespace Reporting.Abstractions;

/// <summary>One measure's value in a row, both raw (for the client) and already formatted for display.</summary>
public class PivotCellDto
{
    /// <summary>The aggregated number (a fraction for a percentage), or null where the group had nothing to reduce.</summary>
    public double? Value { get; set; }

    /// <summary>Formatted per the measure column's display configuration; null for a blank cell.</summary>
    public string? DisplayValue { get; set; }
}
