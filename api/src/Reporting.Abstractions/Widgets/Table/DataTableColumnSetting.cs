namespace Reporting.Abstractions;

public class DataTableColumnSetting
{
    public Guid ColumnId { get; set; }

    /// <summary>Null uses the column's name.</summary>
    public string? Header { get; set; }

    /// <summary>Pixels.</summary>
    public int? Width { get; set; }

    /// <summary>Null aligns numbers right, everything else left.</summary>
    public ColumnAlign? Align { get; set; }

    public bool Sortable { get; set; } = true;

    public ToleranceConfig? Tolerance { get; set; }

    /// <summary>Null leaves the total blank.</summary>
    public Aggregate? Total { get; set; }

    public bool Wrap { get; set; }

    public bool DataBars { get; set; }

    /// <summary>The first matching rule wins.</summary>
    public List<FormatRule> FormatRules { get; set; } = new();
}
