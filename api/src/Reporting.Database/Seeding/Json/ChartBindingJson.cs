namespace Reporting.Database;

internal static class ChartBindingJson
{
    /// <summary>
    /// A point binding passes <paramref name="yRef"/>; a bar or combo binding passes <paramref name="valueRefs"/>,
    /// the first mirrored into yColumnId.
    /// </summary>
    public static string Binding(
        int datasetId, Guid xRef, Guid? yRef = null, Guid[]? valueRefs = null, Guid? seriesRef = null,
        string? renderAs = null, string? yAxisId = null, string label = "", string? color = null,
        string? symbol = null, string? dashStyle = null, string filterJson = "null")
    {
        var hasValues = valueRefs is { Length: > 0 };
        var values = hasValues ? "[" + SeedJson.GuidArray(valueRefs!) + "]" : "null";
        var yColumn = hasValues ? SeedJson.Guid(valueRefs![0]) : SeedJson.Guid(yRef);
        return $$"""
            {"id":"{{Guid.NewGuid()}}","datasetId":{{datasetId}},"xColumnId":"{{xRef}}","yColumnId":{{yColumn}},"valueColumnIds":{{values}},"seriesColumnId":{{SeedJson.Guid(seriesRef)}},"renderAs":{{SeedJson.String(renderAs)}},"yAxisId":{{SeedJson.String(yAxisId)}},"label":"{{label}}","color":{{SeedJson.String(color)}},"symbol":{{SeedJson.String(symbol)}},"dashStyle":{{SeedJson.String(dashStyle)}},"filter":{{filterJson}}}
            """;
    }

    /// <summary>The value axes, the first being the primary.</summary>
    public static string Axes(params (string Id, string Label, string Side)[] axes)
    {
        return "[" + string.Join(",", axes.Select(a => $$"""{"id":"{{a.Id}}","label":"{{a.Label}}","side":"{{a.Side}}"}""")) + "]";
    }

    public static string TooltipColumns(params Guid[] refs)
    {
        return "[" + string.Join(",", refs.Select(r => $$"""{"columnId":"{{r}}"}""")) + "]";
    }
}
