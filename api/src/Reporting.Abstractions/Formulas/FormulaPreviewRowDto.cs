namespace Reporting.Abstractions;

public class FormulaPreviewRowDto
{
    public Guid RowId { get; set; }

    /// <summary>Null when blank.</summary>
    public string? Value { get; set; }
    public string? Error { get; set; }

    /// <summary>Each input column's value by name, so a surprising result can be traced.</summary>
    public Dictionary<string, string?> Inputs { get; set; } = new();
}
