namespace Reporting.Abstractions;

/// <summary>
/// Picks a data row's limits row by value: the row of the limits dataset whose
/// <see cref="SourceColumnId"/> equals the data row's <see cref="ColumnId"/>. Text is compared
/// ignoring case and surrounding spaces, numbers by value. A row with no match, or an empty value,
/// simply isn't highlighted; if several limits rows share a value the first one wins.
/// </summary>
public class ToleranceMatch
{
    /// <summary>The column of the table's own dataset whose value identifies the row's spec.</summary>
    public Guid ColumnId { get; set; }

    /// <summary>The column of the limits dataset holding the same identifier.</summary>
    public Guid SourceColumnId { get; set; }
}
