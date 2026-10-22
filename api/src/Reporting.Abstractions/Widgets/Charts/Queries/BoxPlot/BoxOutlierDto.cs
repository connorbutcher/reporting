namespace Reporting.Abstractions;

public class BoxOutlierDto
{
    /// <summary>Index into <see cref="BoxPlotQueryResultDto.Categories"/>.</summary>
    public int CategoryIndex { get; set; }
    public double Value { get; set; }
}
