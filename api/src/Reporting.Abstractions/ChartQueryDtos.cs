namespace Reporting.Abstractions;

public class ChartQueryDto
{
    public FilterGroupDto? Filter { get; set; }
    public Guid XColumnId { get; set; }
    public Guid YColumnId { get; set; }
    public Guid? SeriesColumnId { get; set; }
    public List<ChartToleranceBand> ToleranceBands { get; set; } = new();
    public List<ChartTooltipColumn> TooltipColumns { get; set; } = new();
}

public class ChartPointDto
{
    public double X { get; set; }
    public double Y { get; set; }

    /// <summary>One "prefix+value+suffix" entry per configured tooltip column, in order. Missing values are omitted.</summary>
    public List<string> TooltipLines { get; set; } = new();
}

public class ChartSeriesDto
{
    /// <summary>Resolved series key, "(blank)" already applied. Empty when there's no series column.</summary>
    public string Label { get; set; } = string.Empty;
    public List<ChartPointDto> Points { get; set; } = new();
}

public class ResolvedToleranceBandDto
{
    /// <summary>Echoes ChartToleranceBand.Id so the client can key markLine styling per band.</summary>
    public string Id { get; set; } = string.Empty;
    public ChartAxis Axis { get; set; }

    /// <summary>Null when the referenced row/columns can't be resolved — the client skips this band.</summary>
    public double? Min { get; set; }
    public double? Max { get; set; }
    public double? ConcessionLower { get; set; }
    public double? ConcessionUpper { get; set; }
}

public class ChartQueryResultDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<ChartSeriesDto> Series { get; set; } = new();
    public List<ResolvedToleranceBandDto> ToleranceBands { get; set; } = new();
}
