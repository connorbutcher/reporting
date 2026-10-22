namespace Reporting.Abstractions;

public class PivotRowDto
{
    /// <summary>One per row field; a subtotal row leaves its inner dimensions blank.</summary>
    public List<string> Dimensions { get; set; } = new();

    /// <summary>One per measure, or one block per column key followed by a row-totals block.</summary>
    public List<PivotCellDto> Values { get; set; } = new();

    public bool IsGrandTotal { get; set; }

    public bool IsSubtotal { get; set; }

    /// <summary>Row fields this row is grouped by; fewer for a subtotal.</summary>
    public int Depth { get; set; }

    /// <summary>Null when it can't be expressed.</summary>
    public FilterGroupDto? Drill { get; set; }
}
