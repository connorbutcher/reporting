namespace Reporting.Abstractions;

/// <summary>Text matches ignoring case and spaces, numbers by value. Unmatched rows aren't highlighted; first match wins.</summary>
public class ToleranceMatch
{
    /// <summary>In the table's own dataset.</summary>
    public Guid ColumnId { get; set; }

    /// <summary>In the limits dataset.</summary>
    public Guid SourceColumnId { get; set; }
}
