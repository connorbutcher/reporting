namespace Reporting.Abstractions;

/// <summary>Pass/concession/fail banding resolved against a separate limits dataset.</summary>
public class ToleranceConfig
{
    public int SourceDatasetId { get; set; }

    /// <summary>Null when <see cref="Match"/> picks the row instead.</summary>
    public Guid? SourceRowId { get; set; }

    /// <summary>Picks each data row's limits row by value instead of one fixed row.</summary>
    public ToleranceMatch? Match { get; set; }

    public Guid MinColumnId { get; set; }
    public Guid MaxColumnId { get; set; }
    public Guid? ConcessionLowerColumnId { get; set; }
    public Guid? ConcessionUpperColumnId { get; set; }
}
