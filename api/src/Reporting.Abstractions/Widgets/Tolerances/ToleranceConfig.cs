namespace Reporting.Abstractions;

/// <summary>
/// Red/amber banding for a numeric column, resolved against a separate limits dataset so the same
/// spec can be reused across columns and reports. Min/Max is the in-spec range; the optional
/// concession bounds widen it into an amber "needs sign-off" zone before a value goes red.
///
/// By default every value is checked against one fixed row of the limits dataset
/// (<see cref="SourceRowId"/>). Opting in to <see cref="Match"/> instead picks the limits row per
/// data row, by matching a value in the row against a column of the limits dataset.
/// </summary>
public class ToleranceConfig
{
    public int SourceDatasetId { get; set; }

    /// <summary>The fixed limits row. Null when <see cref="Match"/> chooses the row per data row.</summary>
    public Guid? SourceRowId { get; set; }

    /// <summary>Opt-in: choose each data row's limits row by matching values, instead of one fixed row.</summary>
    public ToleranceMatch? Match { get; set; }

    public Guid MinColumnId { get; set; }
    public Guid MaxColumnId { get; set; }
    public Guid? ConcessionLowerColumnId { get; set; }
    public Guid? ConcessionUpperColumnId { get; set; }
}
