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
    /// <summary>A coordinate is a number for a numeric axis column, or a string for a text (category) one.
    /// Serialized by its runtime type, so the client reads <c>number | string</c>.</summary>
    public object X { get; set; } = 0d;
    public object Y { get; set; } = 0d;

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

    /// <summary>Presentation flags echoed from the band config so the client can render without it.</summary>
    public bool Fill { get; set; }
    public bool OutlinePoints { get; set; }
}

/// <summary>
/// The row counts every chart result carries, so its widget can show the same "N of M rows" footer
/// the table does. Counted against the dataset's rows, before any per-chart narrowing (a point chart
/// dropping rows with no axis value, a bar chart skipping rows with no measure).
/// </summary>
public abstract class ChartResultCountsDto
{
    /// <summary>Every row in the dataset, ignoring the filter.</summary>
    public int TotalRowCount { get; set; }

    /// <summary>The rows the filter matches; equals <see cref="TotalRowCount"/> when there is no filter.</summary>
    public int MatchedRowCount { get; set; }
}

/// <summary>
/// The counts of a chart that reads its rows through a capped in-memory scan (box plot, histogram),
/// so the widget can say when its figures cover only the first <see cref="ScannedRowCount"/> rows.
/// </summary>
public abstract class ScanCappedChartResultDto : ChartResultCountsDto
{
    /// <summary>True when more rows carried a value than the scan cap, so the chart summarises only a prefix of them.</summary>
    public bool Truncated { get; set; }

    /// <summary>How many rows the chart actually read — the scan cap when <see cref="Truncated"/>, else every row with a value.</summary>
    public int ScannedRowCount { get; set; }
}

public class ChartQueryResultDto : ChartResultCountsDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<ChartSeriesDto> Series { get; set; } = new();
    public List<ResolvedToleranceBandDto> ToleranceBands { get; set; } = new();

    /// <summary>Total rows that matched before the point cap; equals the plotted count when not truncated.</summary>
    public int TotalPoints { get; set; }

    /// <summary>True when more points matched than were returned, so the client can say the plot is a subset.</summary>
    public bool Truncated { get; set; }
}
