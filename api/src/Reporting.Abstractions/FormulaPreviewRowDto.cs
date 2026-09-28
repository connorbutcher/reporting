namespace Reporting.Abstractions;

public class FormulaPreviewRowDto
{
    public Guid RowId { get; set; }

    /// <summary>The computed value in the column's canonical text form; null when blank.</summary>
    public string? Value { get; set; }
    public string? Error { get; set; }

    /// <summary>What this row holds in each column the formula reads, by column name — so a blank or surprising result can be traced to its inputs. Null when the cell is blank.</summary>
    public Dictionary<string, string?> Inputs { get; set; } = new();
}
