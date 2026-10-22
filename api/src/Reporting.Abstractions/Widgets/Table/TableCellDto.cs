namespace Reporting.Abstractions;

public class TableCellDto
{
    /// <summary>Null for a blank cell.</summary>
    public string? DisplayValue { get; set; }

    /// <summary>Typed per the column; used for export and conditional formatting.</summary>
    public object? Value { get; set; }

    public ToleranceStatus Tolerance { get; set; } = ToleranceStatus.None;
}
