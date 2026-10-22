namespace Reporting.Database;

internal static class PivotWidgetJson
{
    public static string Config(string title, Dataset dataset, Guid[] rowFieldRefs, PivotMeasureSeed[] measures)
    {
        var measuresJson = string.Join(",", measures.Select(Measure));
        return $$"""
            {"type":"pivotTable","title":"{{title}}","showTitle":true,
             "datasetId":{{dataset.Id}},
             "rowFields":[{{SeedJson.GuidArray(rowFieldRefs)}}],
             "measures":[{{measuresJson}}],
             "showGrandTotal":true,"filter":null}
            """;
    }

    private static string Measure(PivotMeasureSeed measure)
    {
        return $$"""{"id":"{{Guid.NewGuid()}}","columnId":{{SeedJson.Guid(measure.Column)}},"aggregate":"{{measure.Aggregate}}","label":"{{measure.Label}}"}""";
    }
}
