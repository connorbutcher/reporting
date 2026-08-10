namespace Reporting.Abstractions;

/// <summary>Where a value falls relative to a resolved tolerance band, already classified server-side.</summary>
public enum ToleranceStatus
{
    None,
    Pass,
    Concession,
    Fail
}

// --- table-query -------------------------------------------------------

public class TableQueryDto
{
    public FilterGroupDto? Filter { get; set; }
    public Guid? SortColumnId { get; set; }
    public SortDirection SortDirection { get; set; } = SortDirection.Asc;
    public int Skip { get; set; }
    public int Take { get; set; } = 50;

    /// <summary>The widget's own column settings, so tolerance/format resolve exactly as configured.</summary>
    public List<DataTableColumnSetting> Columns { get; set; } = new();
}

public class TableCellDto
{
    /// <summary>Already formatted per the column's stored display configuration. Null for a blank cell.</summary>
    public string? DisplayValue { get; set; }
    public ToleranceStatus Tolerance { get; set; } = ToleranceStatus.None;
}

public class TableRowResultDto
{
    public Guid Id { get; set; }

    /// <summary>Keyed by column id, one entry per column in the request's Columns list.</summary>
    public Dictionary<Guid, TableCellDto> Cells { get; set; } = new();
}

public class TableQueryResultDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<TableRowResultDto> Rows { get; set; } = new();

    /// <summary>Rows in the dataset before filtering, so the widget can show "142 of 1,203".</summary>
    public int TotalRowCount { get; set; }
    public int MatchedRowCount { get; set; }
}

// --- chart-query -------------------------------------------------------

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
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<ChartSeriesDto> Series { get; set; } = new();
    public List<ResolvedToleranceBandDto> ToleranceBands { get; set; } = new();
}
