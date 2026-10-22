namespace Reporting.Abstractions;

/// <summary>
/// One subgroup's mean and range, plus the control limits it's judged against — carried per
/// subgroup (rather than once for the whole chart) because they vary with that subgroup's own
/// sample size when subgroup sizes aren't all equal.
/// </summary>
public class XBarRSubgroupDto
{
    public double Mean { get; set; }
    public double Range { get; set; }

    /// <summary>How many rows fed this subgroup.</summary>
    public int Count { get; set; }

    /// <summary>Whether <see cref="Range"/> means anything: false for a subgroup of one, or the first individual (no moving range yet).</summary>
    public bool HasRange { get; set; }

    public double XBarUcl { get; set; }
    public double XBarLcl { get; set; }
    public double RUcl { get; set; }
    public double RLcl { get; set; }

    /// <summary>Whether this subgroup's mean falls outside its own X-bar control limits.</summary>
    public bool MeanOutOfControl { get; set; }

    /// <summary>Whether this subgroup's range falls outside its own R control limits.</summary>
    public bool RangeOutOfControl { get; set; }

    /// <summary>The Nelson rules (1–5) this point breaks on the X-bar chart; rule 1 is "beyond the limits".</summary>
    public List<int> MeanRules { get; set; } = new();

    /// <summary>The Nelson rules this point breaks on the range (or σ / moving range) chart.</summary>
    public List<int> RangeRules { get; set; } = new();
}
