namespace Reporting.Abstractions;

/// <summary>Evaluates an unsaved expression against a sample of a dataset's rows.</summary>
public class FormulaPreviewRequestDto
{
    public string Expression { get; set; } = string.Empty;
    public DatasetColumnType? Type { get; set; }
    public int SampleSize { get; set; } = 10;
}
