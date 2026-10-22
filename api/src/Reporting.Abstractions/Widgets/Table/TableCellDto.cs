namespace Reporting.Abstractions;

public class TableCellDto
{
    /// <summary>Already formatted per the column's stored display configuration. Null for a blank cell.</summary>
    public string? DisplayValue { get; set; }

    /// <summary>
    /// The cell's typed value: a number, a date, true/false, or text, per the column's type. Null for a
    /// blank cell. Lets the client export real numbers and evaluate conditional formatting.
    /// </summary>
    public object? Value { get; set; }

    public ToleranceStatus Tolerance { get; set; } = ToleranceStatus.None;
}
