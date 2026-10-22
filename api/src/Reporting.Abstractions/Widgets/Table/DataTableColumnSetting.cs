namespace Reporting.Abstractions;

/// <summary>A column placed on the table, in display order.</summary>
public class DataTableColumnSetting
{
    public Guid ColumnId { get; set; }

    /// <summary>Overrides the dataset column's name in the header.</summary>
    public string? Header { get; set; }

    /// <summary>Pixel width kept after the user resizes the column.</summary>
    public int? Width { get; set; }

    /// <summary>Null falls back to right for numbers, left otherwise.</summary>
    public ColumnAlign? Align { get; set; }

    public bool Sortable { get; set; } = true;

    /// <summary>Pass/fail highlighting for this column's values. Null shows no banding.</summary>
    public ToleranceConfig? Tolerance { get; set; }

    /// <summary>The aggregate shown for this column in the totals row. Null leaves its total blank.</summary>
    public Aggregate? Total { get; set; }

    /// <summary>Wraps long values onto more lines instead of clipping them to one.</summary>
    public bool Wrap { get; set; }

    /// <summary>Draws a bar behind each numeric value, scaled between the column's min and max.</summary>
    public bool DataBars { get; set; }

    /// <summary>Conditional highlighting, evaluated in order; the first rule a value matches wins.</summary>
    public List<FormatRule> FormatRules { get; set; } = new();
}
