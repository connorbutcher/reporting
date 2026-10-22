namespace Reporting.Abstractions;

/// <summary>Which control chart pair an <see cref="XBarRChartWidgetConfig"/> draws.</summary>
public enum ControlChartMode
{
    /// <summary>Subgroup means and ranges.</summary>
    XBarR,

    /// <summary>Subgroup means and standard deviations — better for subgroups larger than ~10.</summary>
    XBarS,

    /// <summary>Individual values and their moving ranges, one point per row (subgroups of one).</summary>
    Individuals,

    /// <summary>
    /// Attribute chart: each subgroup's proportion of defective units. The value column marks a
    /// defective unit with any non-zero value (1) and a good one with 0. No second chart.
    /// </summary>
    P,

    /// <summary>Attribute chart: each subgroup's number of defective units — best with equal-sized subgroups.</summary>
    Np
}
