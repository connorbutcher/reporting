namespace Reporting.Abstractions;

public class FormulaPreviewRequestDto
{
    public string Expression { get; set; } = string.Empty;
    public DatasetColumnType? Type { get; set; }
    public int SampleSize { get; set; } = 10;
}
