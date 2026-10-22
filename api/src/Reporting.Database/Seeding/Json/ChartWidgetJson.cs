using System.Globalization;

namespace Reporting.Database;

internal static class ChartWidgetJson
{
    /// <summary>
    /// One series per value column; stacked piles a category's measures into one column. A null
    /// <paramref name="sortJson"/> keeps the natural order; <paramref name="categoryGrouping"/> buckets a date category.
    /// </summary>
    public static string Bar(
        string title, Dataset dataset, Guid categoryRef, Guid[] valueRefs, string aggregate,
        bool stacked, bool horizontal, string yAxisLabel, Guid? seriesRef = null,
        string? sortJson = null, string? categoryGrouping = null, bool percentStacked = false,
        bool showStackTotals = false, bool showValueLabels = false, string guideLinesJson = "[]")
    {
        var bindingId = Guid.NewGuid();
        return $$"""
            {"type":"barChart","title":"{{title}}","showTitle":true,
             "aggregate":"{{aggregate}}","stacked":{{SeedJson.Bool(stacked)}},"horizontal":{{SeedJson.Bool(horizontal)}},
             "sort":{{sortJson ?? ChartSortJson.Default()}},"categoryGrouping":{{SeedJson.String(categoryGrouping)}},
             "percentStacked":{{SeedJson.Bool(percentStacked)}},"showStackTotals":{{SeedJson.Bool(showStackTotals)}},
             "bindings":[{"id":"{{bindingId}}","datasetId":{{dataset.Id}},"xColumnId":"{{categoryRef}}","yColumnId":"{{valueRefs[0]}}","valueColumnIds":[{{SeedJson.GuidArray(valueRefs)}}],"seriesColumnId":{{SeedJson.Guid(seriesRef)}},"yAxisId":null,"label":"","color":null,"symbol":null,"dashStyle":null,"filter":null}],
             "yAxes":[{"id":"primary","label":"{{yAxisLabel}}","side":"left"}],
             "xAxisLabel":"","yAxisLabel":"{{yAxisLabel}}",
             "zoom":false,"showLegend":true,"pointSize":8,
             "showGridLines":true,"showValueLabels":{{SeedJson.Bool(showValueLabels)}},
             "toleranceBands":[],"guideLines":{{guideLinesJson}},"tooltipColumns":[]}
            """;
    }

    public static string BoxPlot(
        string title, Dataset dataset, Guid categoryRef, Guid valueRef, Guid? seriesRef, string whisker, string yAxisLabel,
        bool showMean = false, bool showSampleSize = false, bool showPoints = false, bool showCapability = false,
        string bandsJson = "[]", bool horizontal = false, string? categoryGrouping = null)
    {
        var bindingId = Guid.NewGuid();
        return $$"""
            {"type":"boxPlot","title":"{{title}}","showTitle":true,
             "bindings":[{"id":"{{bindingId}}","datasetId":{{dataset.Id}},"xColumnId":"{{categoryRef}}","yColumnId":"{{valueRef}}","seriesColumnId":{{SeedJson.Guid(seriesRef)}},"yAxisId":null,"label":"","color":null,"symbol":null,"dashStyle":null,"filter":null}],
             "yAxes":[{"id":"primary","label":"{{yAxisLabel}}","side":"left"}],
             "xAxisLabel":"","yAxisLabel":"{{yAxisLabel}}",
             "zoom":false,"showLegend":true,"pointSize":8,
             "showGridLines":true,"showValueLabels":false,
             "toleranceBands":{{bandsJson}},"guideLines":[],"tooltipColumns":[],
             "whisker":"{{whisker}}","whiskerFactor":1.5,"sort":{{ChartSortJson.Default()}},
             "showMean":{{SeedJson.Bool(showMean)}},"showSampleSize":{{SeedJson.Bool(showSampleSize)}},"showPoints":{{SeedJson.Bool(showPoints)}},"showCapability":{{SeedJson.Bool(showCapability)}},
             "horizontal":{{SeedJson.Bool(horizontal)}},"categoryGrouping":{{SeedJson.String(categoryGrouping)}}}
            """;
    }

    public static string Histogram(
        string title, string bindingsJson, string xAxisLabel, string yAxisLabel, string binMode, int binCount,
        string normalize, bool showLegend, bool cumulative = false, string bandsJson = "[]", bool showNormalCurve = false)
    {
        return $$"""
            {"type":"histogram","title":"{{title}}","showTitle":true,
             "bindings":[{{bindingsJson}}],
             "yAxes":[{"id":"primary","label":"{{yAxisLabel}}","side":"left"}],
             "xAxisLabel":"{{xAxisLabel}}","yAxisLabel":"{{yAxisLabel}}",
             "zoom":false,"showLegend":{{SeedJson.Bool(showLegend)}},"pointSize":8,
             "showGridLines":true,"showValueLabels":false,
             "toleranceBands":{{bandsJson}},"guideLines":[],"tooltipColumns":[],
             "binMode":"{{binMode}}","binCount":{{binCount}},"binWidth":1,"rangeMin":null,"rangeMax":null,
             "normalize":"{{normalize}}","cumulative":{{SeedJson.Bool(cumulative)}},"horizontal":false,
             "showNormalCurve":{{SeedJson.Bool(showNormalCurve)}}}
            """;
    }

    /// <summary>
    /// No series split: a control chart's axis is the subgroup sequence. <paramref name="mode"/> picks Xbar-R,
    /// Xbar-S, individuals (I-MR), p or np; <paramref name="baselineSubgroups"/> holds the limits from the first N points.
    /// </summary>
    public static string XBarR(
        string title, Dataset dataset, Guid categoryRef, Guid valueRef, string yAxisLabel,
        bool highlightOutOfControl = true, string bandsJson = "[]", string mode = "xBarR",
        string? categoryGrouping = null, int? baselineSubgroups = null, bool runRules = false)
    {
        var bindingId = Guid.NewGuid();
        var baseline = baselineSubgroups is { } n ? n.ToString(CultureInfo.InvariantCulture) : "null";
        return $$"""
            {"type":"xbarRChart","title":"{{title}}","showTitle":true,
             "bindings":[{"id":"{{bindingId}}","datasetId":{{dataset.Id}},"xColumnId":"{{categoryRef}}","yColumnId":"{{valueRef}}","seriesColumnId":null,"yAxisId":null,"label":"","color":null,"symbol":null,"dashStyle":null,"filter":null}],
             "yAxes":[{"id":"primary","label":"{{yAxisLabel}}","side":"left"}],
             "xAxisLabel":"","yAxisLabel":"{{yAxisLabel}}",
             "zoom":false,"showLegend":true,"pointSize":8,
             "showGridLines":true,"showValueLabels":false,
             "toleranceBands":{{bandsJson}},"guideLines":[],"tooltipColumns":[],
             "sort":{{ChartSortJson.Default()}},"highlightOutOfControl":{{SeedJson.Bool(highlightOutOfControl)}},
             "mode":"{{mode}}","categoryGrouping":{{SeedJson.String(categoryGrouping)}},
             "baselineSubgroups":{{baseline}},"runRules":{{SeedJson.Bool(runRules)}}}
            """;
    }

    /// <summary>
    /// A scatter or line chart; the line-only options (including <paramref name="aggregate"/> and
    /// <paramref name="xGrouping"/>, which reduce rows per X) are written for a line chart only.
    /// </summary>
    public static string Point(
        string type, string title, string bindingsJson, string yAxesJson, string xAxisLabel,
        string tooltipColumnsJson = "[]", string bandsJson = "[]", bool colorByValue = false,
        bool zoom = true, bool showLegend = true, bool smooth = false, bool showPoints = true, bool areaFill = false,
        bool showTrendLine = false, string guideLinesJson = "[]", string? aggregate = null, string? xGrouping = null)
    {
        var lineOptions = type == "lineChart"
            ? $",\"smooth\":{SeedJson.Bool(smooth)},\"showPoints\":{SeedJson.Bool(showPoints)},\"areaFill\":{SeedJson.Bool(areaFill)},\"aggregate\":{SeedJson.String(aggregate)},\"xGrouping\":{SeedJson.String(xGrouping)}"
            : "";
        return $$"""
            {"type":"{{type}}","title":"{{title}}","showTitle":true,
             "bindings":[{{bindingsJson}}],
             "yAxes":{{yAxesJson}},
             "xAxisLabel":"{{xAxisLabel}}","yAxisLabel":"",
             "zoom":{{SeedJson.Bool(zoom)}},"zoomY":false,"showLegend":{{SeedJson.Bool(showLegend)}},"pointSize":9,
             "showGridLines":true,"showValueLabels":false,"colorByValue":{{SeedJson.Bool(colorByValue)}},
             "showTrendLine":{{SeedJson.Bool(showTrendLine)}},
             "toleranceBands":{{bandsJson}},"guideLines":{{guideLinesJson}},"tooltipColumns":{{tooltipColumnsJson}}{{lineOptions}}}
            """;
    }

    public static string Combo(
        string title, string bindingsJson, string yAxesJson, string xAxisLabel, string aggregate,
        bool stacked, bool smooth, bool showPoints, bool areaFill, string bandsJson = "[]",
        string? categoryGrouping = null, bool connectNulls = false, string guideLinesJson = "[]")
    {
        return $$"""
            {"type":"comboChart","title":"{{title}}","showTitle":true,
             "aggregate":"{{aggregate}}","stacked":{{SeedJson.Bool(stacked)}},"smooth":{{SeedJson.Bool(smooth)}},"showPoints":{{SeedJson.Bool(showPoints)}},"areaFill":{{SeedJson.Bool(areaFill)}},
             "sort":{{ChartSortJson.Default()}},"categoryGrouping":{{SeedJson.String(categoryGrouping)}},"connectNulls":{{SeedJson.Bool(connectNulls)}},
             "bindings":[{{bindingsJson}}],
             "yAxes":{{yAxesJson}},
             "xAxisLabel":"{{xAxisLabel}}","yAxisLabel":"",
             "zoom":false,"showLegend":true,"pointSize":9,
             "showGridLines":true,"showValueLabels":false,
             "toleranceBands":{{bandsJson}},"guideLines":{{guideLinesJson}},"tooltipColumns":[]}
            """;
    }

    /// <summary>A shaded band on the spec row's LSL/USL that outlines out-of-spec marks. Histograms use axis "x".</summary>
    public static string SpecBand(int specDatasetId, Guid rowRef, Guid minRef, Guid maxRef, string axis = "y")
    {
        var bandId = Guid.NewGuid();
        return $$"""
            [{"id":"{{bandId}}","axis":"{{axis}}","yAxisId":null,"sourceDatasetId":{{specDatasetId}},"sourceRowId":"{{rowRef}}","minColumnId":"{{minRef}}","maxColumnId":"{{maxRef}}","fill":true,"outlinePoints":true}]
            """;
    }
}
