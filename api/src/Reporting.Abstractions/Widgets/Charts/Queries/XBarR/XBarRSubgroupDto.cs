namespace Reporting.Abstractions;

/// <summary>Limits are per subgroup because they vary with its sample size.</summary>
public class XBarRSubgroupDto
{
    public double Mean { get; set; }
    public double Range { get; set; }

    public int Count { get; set; }

    /// <summary>False for a subgroup of one, or the first individual.</summary>
    public bool HasRange { get; set; }

    public double XBarUcl { get; set; }
    public double XBarLcl { get; set; }
    public double RUcl { get; set; }
    public double RLcl { get; set; }

    public bool MeanOutOfControl { get; set; }

    public bool RangeOutOfControl { get; set; }

    /// <summary>Nelson rules (1–5) broken; rule 1 is beyond the limits.</summary>
    public List<int> MeanRules { get; set; } = new();

    public List<int> RangeRules { get; set; } = new();
}
