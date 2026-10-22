namespace Reporting.Database;

internal static class FilterJson
{
    public static string Condition(Guid columnRef, string op, params string[] values)
    {
        var vals = string.Join(",", values.Select(v => $"\"{v}\""));
        return $$"""{"kind":"condition","columnId":"{{columnRef}}","operator":"{{op}}","values":[{{vals}}]}""";
    }

    public static string Group(string join, params string[] conditions)
    {
        return $$"""{"kind":"group","join":"{{join}}","children":[{{string.Join(",", conditions)}}]}""";
    }

    /// <summary>A revision's report-level filters: one filter group per dataset.</summary>
    public static string ReportFilters(params (int DatasetId, string FilterGroup)[] filters)
    {
        return "[" + string.Join(",", filters.Select(f => $$"""{"datasetId":{{f.DatasetId}},"filter":{{f.FilterGroup}}}""")) + "]";
    }

    public static string FilteredSourceConfig(int baseDatasetId, string filterGroupJson)
    {
        return $$"""{"source":"filtered","baseDatasetId":{{baseDatasetId}},"filter":{{filterGroupJson}}}""";
    }
}
