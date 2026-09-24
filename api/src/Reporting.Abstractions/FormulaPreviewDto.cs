namespace Reporting.Abstractions;

public class FormulaPreviewDto
{
    public bool IsValid { get; set; }
    public List<FormulaErrorDto> Errors { get; set; } = new();

    /// <summary>The column type the expression evaluates to; null when it can't be told statically.</summary>
    public DatasetColumnType? InferredType { get; set; }

    /// <summary>The columns the formula reads, in dataset order — the keys of each row's <c>Inputs</c>.</summary>
    public List<string> InputColumns { get; set; } = new();

    public List<FormulaPreviewRowDto> Rows { get; set; } = new();
}
