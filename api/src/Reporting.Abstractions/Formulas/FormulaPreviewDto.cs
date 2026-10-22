namespace Reporting.Abstractions;

public class FormulaPreviewDto
{
    public bool IsValid { get; set; }
    public List<FormulaErrorDto> Errors { get; set; } = new();

    /// <summary>Null when it can't be told statically.</summary>
    public DatasetColumnType? InferredType { get; set; }

    /// <summary>In dataset order; the keys of each row's Inputs.</summary>
    public List<string> InputColumns { get; set; } = new();

    public List<FormulaPreviewRowDto> Rows { get; set; } = new();
}
