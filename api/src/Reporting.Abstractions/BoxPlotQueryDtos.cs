namespace Reporting.Abstractions;

public class BoxPlotQueryDto
{
    public FilterGroupDto? Filter { get; set; }

    /// <summary>The column whose distinct values become the boxes (any type).</summary>
    public Guid CategoryColumnId { get; set; }

    /// <summary>The numeric column whose per-category distribution each box summarises.</summary>
    public Guid ValueColumnId { get; set; }

    /// <summary>Splits each category into a box per distinct value. Null yields one box per category.</summary>
    public Guid? SeriesColumnId { get; set; }

    /// <summary>Where the whiskers end, and whether outliers are drawn beyond them.</summary>
    public BoxWhisker Whisker { get; set; } = BoxWhisker.Tukey;

    /// <summary>The whisker length multiplier — of the IQR for Tukey, of the standard deviation for StdDev.</summary>
    public double WhiskerFactor { get; set; } = 1.5;

    /// <summary>How the categories are ordered along the axis.</summary>
    public BoxSort Sort { get; set; } = BoxSort.Category;

    /// <summary>When set, each box also carries a (capped) sample of its raw values for a jittered overlay.</summary>
    public bool IncludePoints { get; set; }

    public List<ChartToleranceBand> ToleranceBands { get; set; } = new();
}

/// <summary>One category's five-number summary for a series, already reduced from its rows.</summary>
public class BoxDto
{
    /// <summary>The lower whisker end: the actual minimum, or the smallest value inside the lower fence.</summary>
    public double Min { get; set; }
    public double Q1 { get; set; }
    public double Median { get; set; }
    public double Q3 { get; set; }

    /// <summary>The upper whisker end: the actual maximum, or the largest value inside the upper fence.</summary>
    public double Max { get; set; }

    /// <summary>The arithmetic mean, for the optional mean marker and capability (Cp/Cpk).</summary>
    public double Mean { get; set; }

    /// <summary>The sample standard deviation (n−1); 0 for a single value. Feeds capability and StdDev whiskers.</summary>
    public double StdDev { get; set; }

    /// <summary>How many rows fed this box, surfaced in the tooltip and the optional n label.</summary>
    public int Count { get; set; }

    /// <summary>A capped sample of the raw values behind this box, for the jittered overlay. Empty unless requested.</summary>
    public List<double> Points { get; set; } = new();
}

/// <summary>A single value that fell beyond a Tukey whisker, tagged with the category slot it belongs to.</summary>
public class BoxOutlierDto
{
    /// <summary>Index into <see cref="BoxPlotQueryResultDto.Categories"/> — the box this point sits above.</summary>
    public int CategoryIndex { get; set; }
    public double Value { get; set; }
}

public class BoxPlotSeriesDto
{
    /// <summary>Resolved series key, "(blank)" already applied. Empty when there's no series column.</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>One entry per category in <see cref="BoxPlotQueryResultDto.Categories"/> order; null where this series has no rows in that category.</summary>
    public List<BoxDto?> Boxes { get; set; } = new();

    /// <summary>Values past the whiskers (Tukey only), each carrying its category index. Empty for min/max whiskers.</summary>
    public List<BoxOutlierDto> Outliers { get; set; } = new();
}

public class BoxPlotQueryResultDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>The box categories, in display order — the shared axis every series aligns to.</summary>
    public List<string> Categories { get; set; } = new();
    public List<BoxPlotSeriesDto> Series { get; set; } = new();

    /// <summary>Reference lines for the value axis, resolved the same way as scatter/line/bar bands.</summary>
    public List<ResolvedToleranceBandDto> ToleranceBands { get; set; } = new();
}
