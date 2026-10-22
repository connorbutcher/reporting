namespace Reporting.Database;

internal static class ChartWidgetJson
{
    /// <summary>One series per value column; stacked piles a category's measures into one column.</summary>
    public static string Bar(
        string title, Dataset dataset, Guid categoryRef, Guid[] valueRefs, string aggregate,
        bool stacked, bool horizontal, string yAxisLabel, Guid? seriesRef = null)
    {
        var bindingId = Guid.NewGuid();
        return $$"""
            {"type":"barChart","title":"{{title}}","showTitle":true,
             "aggregate":"{{aggregate}}","stacked":{{SeedJson.Bool(stacked)}},"horizontal":{{SeedJson.Bool(horizontal)}},
             "bindings":[{"id":"{{bindingId}}","datasetId":{{dataset.Id}},"xColumnId":"{{categoryRef}}","yColumnId":"{{valueRefs[0]}}","valueColumnIds":[{{SeedJson.GuidArray(valueRefs)}}],"seriesColumnId":{{SeedJson.Guid(seriesRef)}},"yAxisId":null,"label":"","color":null,"symbol":null,"dashStyle":null,"filter":null}],
             "yAxes":[{"id":"primary","label":"{{yAxisLabel}}","side":"left"}],
             "xAxisLabel":"","yAxisLabel":"{{yAxisLabel}}",
             "zoom":false,"showLegend":true,"pointSize":8,
             "showGridLines":true,"showValueLabels":false,
             "toleranceBands":[],"tooltipColumns":[]}
            """;
    }

    public static string BoxPlot(
        string title, Dataset dataset, Guid categoryRef, Guid valueRef, Guid? seriesRef, string whisker, string yAxisLabel,
        bool showMean = false, bool showSampleSize = false, bool showPoints = false, bool showCapability = false,
        string bandsJson = "[]")
    {
        var bindingId = Guid.NewGuid();
        return $$"""
            {"type":"boxPlot","title":"{{title}}","showTitle":true,
             "bindings":[{"id":"{{bindingId}}","datasetId":{{dataset.Id}},"xColumnId":"{{categoryRef}}","yColumnId":"{{valueRef}}","seriesColumnId":{{SeedJson.Guid(seriesRef)}},"yAxisId":null,"label":"","color":null,"symbol":null,"dashStyle":null,"filter":null}],
             "yAxes":[{"id":"primary","label":"{{yAxisLabel}}","side":"left"}],
             "xAxisLabel":"","yAxisLabel":"{{yAxisLabel}}",
             "zoom":false,"showLegend":true,"pointSize":8,
             "showGridLines":true,"showValueLabels":false,
             "toleranceBands":{{bandsJson}},"tooltipColumns":[],
             "whisker":"{{whisker}}","whiskerFactor":1.5,"sort":"category",
             "showMean":{{SeedJson.Bool(showMean)}},"showSampleSize":{{SeedJson.Bool(showSampleSize)}},"showPoints":{{SeedJson.Bool(showPoints)}},"showCapability":{{SeedJson.Bool(showCapability)}},
             "horizontal":false}
            """;
    }

    public static string Histogram(
        string title, string bindingsJson, string xAxisLabel, string yAxisLabel, string binMode, int binCount,
        string normalize, bool showLegend, bool cumulative = false, string bandsJson = "[]")
    {
        return $$"""
            {"type":"histogram","title":"{{title}}","showTitle":true,
             "bindings":[{{bindingsJson}}],
             "yAxes":[{"id":"primary","label":"{{yAxisLabel}}","side":"left"}],
             "xAxisLabel":"{{xAxisLabel}}","yAxisLabel":"{{yAxisLabel}}",
             "zoom":false,"showLegend":{{SeedJson.Bool(showLegend)}},"pointSize":8,
             "showGridLines":true,"showValueLabels":false,
             "toleranceBands":{{bandsJson}},"tooltipColumns":[],
             "binMode":"{{binMode}}","binCount":{{binCount}},"binWidth":1,"rangeMin":null,"rangeMax":null,
             "normalize":"{{normalize}}","cumulative":{{SeedJson.Bool(cumulative)}},"horizontal":false}
            """;
    }

    /// <summary>No series split or sort: a control chart's axis is the column's own sequence.</summary>
    public static string XBarR(
        string title, Dataset dataset, Guid categoryRef, Guid valueRef, string yAxisLabel,
        bool highlightOutOfControl = true, string bandsJson = "[]")
    {
        var bindingId = Guid.NewGuid();
        return $$"""
            {"type":"xbarRChart","title":"{{title}}","showTitle":true,
             "bindings":[{"id":"{{bindingId}}","datasetId":{{dataset.Id}},"xColumnId":"{{categoryRef}}","yColumnId":"{{valueRef}}","seriesColumnId":null,"yAxisId":null,"label":"","color":null,"symbol":null,"dashStyle":null,"filter":null}],
             "yAxes":[{"id":"primary","label":"{{yAxisLabel}}","side":"left"}],
             "xAxisLabel":"","yAxisLabel":"{{yAxisLabel}}",
             "zoom":false,"showLegend":true,"pointSize":8,
             "showGridLines":true,"showValueLabels":false,
             "toleranceBands":{{bandsJson}},"tooltipColumns":[],
             "highlightOutOfControl":{{SeedJson.Bool(highlightOutOfControl)}}}
            """;
    }

    /// <summary>A scatter or line chart; the line-only options are written for a line chart only.</summary>
    public static string Point(
        string type, string title, string bindingsJson, string yAxesJson, string xAxisLabel,
        string tooltipColumnsJson = "[]", string bandsJson = "[]", bool colorByValue = false,
        bool zoom = true, bool showLegend = true, bool smooth = false, bool showPoints = true, bool areaFill = false)
    {
        var lineOptions = type == "lineChart"
            ? $",\"smooth\":{SeedJson.Bool(smooth)},\"showPoints\":{SeedJson.Bool(showPoints)},\"areaFill\":{SeedJson.Bool(areaFill)}"
            : "";
        return $$"""
            {"type":"{{type}}","title":"{{title}}","showTitle":true,
             "bindings":[{{bindingsJson}}],
             "yAxes":{{yAxesJson}},
             "xAxisLabel":"{{xAxisLabel}}","yAxisLabel":"",
             "zoom":{{SeedJson.Bool(zoom)}},"zoomY":false,"showLegend":{{SeedJson.Bool(showLegend)}},"pointSize":9,
             "showGridLines":true,"showValueLabels":false,"colorByValue":{{SeedJson.Bool(colorByValue)}},
             "toleranceBands":{{bandsJson}},"tooltipColumns":{{tooltipColumnsJson}}{{lineOptions}}}
            """;
    }

    public static string Combo(
        string title, string bindingsJson, string yAxesJson, string xAxisLabel, string aggregate,
        bool stacked, bool smooth, bool showPoints, bool areaFill, string bandsJson = "[]")
    {
        return $$"""
            {"type":"comboChart","title":"{{title}}","showTitle":true,
             "aggregate":"{{aggregate}}","stacked":{{SeedJson.Bool(stacked)}},"smooth":{{SeedJson.Bool(smooth)}},"showPoints":{{SeedJson.Bool(showPoints)}},"areaFill":{{SeedJson.Bool(areaFill)}},
             "bindings":[{{bindingsJson}}],
             "yAxes":{{yAxesJson}},
             "xAxisLabel":"{{xAxisLabel}}","yAxisLabel":"",
             "zoom":false,"showLegend":true,"pointSize":9,
             "showGridLines":true,"showValueLabels":false,
             "toleranceBands":{{bandsJson}},"tooltipColumns":[]}
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
