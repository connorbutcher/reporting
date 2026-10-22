namespace Reporting.Abstractions;

/// <summary>A single value that fell beyond a Tukey whisker, tagged with the category slot it belongs to.</summary>
public class BoxOutlierDto
{
    /// <summary>Index into <see cref="BoxPlotQueryResultDto.Categories"/> — the box this point sits above.</summary>
    public int CategoryIndex { get; set; }
    public double Value { get; set; }
}
