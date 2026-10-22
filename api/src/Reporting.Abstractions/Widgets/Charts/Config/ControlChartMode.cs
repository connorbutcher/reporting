namespace Reporting.Abstractions;

public enum ControlChartMode
{
    XBarR,

    /// <summary>Better for subgroups larger than ~10.</summary>
    XBarS,

    /// <summary>One point per row with moving ranges.</summary>
    Individuals,

    /// <summary>Proportion defective per subgroup; a non-zero value marks a defective unit.</summary>
    P,

    /// <summary>Number defective per subgroup; best with equal-sized subgroups.</summary>
    Np
}
