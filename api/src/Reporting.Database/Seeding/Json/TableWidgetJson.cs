namespace Reporting.Database;

internal static class TableWidgetJson
{
    /// <summary>
    /// <paramref name="datasetIdOverride"/> binds the table to a filtered dataset built on <paramref name="dataset"/>,
    /// whose columns it still resolves against since the filtered dataset owns none.
    /// </summary>
    public static string Config(
        string title, Dataset dataset, string[] columnNames, string filterJson = "null", int? datasetIdOverride = null)
    {
        var columns = columnNames
            .Select(name => SeedDatasets.ColumnRef(dataset, name))
            .Select(id => $"{{\"columnId\":\"{id}\",\"sortable\":true}}");

        return $$"""
            {"type":"dataTable","datasetId":{{datasetIdOverride ?? dataset.Id}},"title":"{{title}}",
             "showTitle":true,"showColumnHeaders":true,"resizableColumns":true,
             "stripedRows":true,"showGridlines":false,"rowHover":true,"density":"compact",
             "paginator":false,"rowsPerPage":10,"emptyMessage":"No rows to display.",
             "filter":{{filterJson}},
             "columns":[{{string.Join(",", columns)}}],"sortColumnId":null,"sortDirection":"asc"}
            """;
    }
}
