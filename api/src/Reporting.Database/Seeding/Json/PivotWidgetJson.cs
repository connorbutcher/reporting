namespace Reporting.Database;

internal static class PivotWidgetJson
{
    /// <summary><paramref name="fieldGroupingsJson"/> buckets date fields by period; see <see cref="DateGrouping(Guid, string)"/>.</summary>
    public static string Config(
        string title, Dataset dataset, Guid[] rowFieldRefs, PivotMeasureSeed[] measures,
        Guid[]? columnFieldRefs = null, string fieldGroupingsJson = "[]", bool showSubtotals = false, bool showGrandTotal = true)
    {
        var measuresJson = string.Join(",", measures.Select(Measure));
        return $$"""
            {"type":"pivotTable","title":"{{title}}","showTitle":true,
             "datasetId":{{dataset.Id}},
             "rowFields":[{{SeedJson.GuidArray(rowFieldRefs)}}],
             "columnFields":[{{SeedJson.GuidArray(columnFieldRefs ?? [])}}],
             "fieldGroupings":{{fieldGroupingsJson}},
             "measures":[{{measuresJson}}],
             "sortMeasureId":null,"sortDescending":true,
             "showGrandTotal":{{SeedJson.Bool(showGrandTotal)}},"showSubtotals":{{SeedJson.Bool(showSubtotals)}},"filter":null}
            """;
    }

    public static string DateGrouping(Guid columnRef, string grouping)
    {
        return $$"""[{"columnId":"{{columnRef}}","grouping":"{{grouping}}"}]""";
    }

    private static string Measure(PivotMeasureSeed measure)
    {
        return $$"""{"id":"{{Guid.NewGuid()}}","columnId":{{SeedJson.Guid(measure.Column)}},"aggregate":"{{measure.Aggregate}}","showAs":"{{measure.ShowAs}}","label":"{{measure.Label}}","dataBars":{{SeedJson.Bool(measure.DataBars)}},"formatRules":{{measure.FormatRulesJson}}}""";
    }
}
