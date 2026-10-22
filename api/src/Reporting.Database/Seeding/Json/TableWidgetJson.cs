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
        var columns = columnNames.Select(name => new TableColumnSeed(name)).ToArray();
        return Config(title, dataset, columns, new TableOptionsSeed(FilterJson: filterJson, DatasetIdOverride: datasetIdOverride));
    }

    public static string Config(string title, Dataset dataset, TableColumnSeed[] columns, TableOptionsSeed options)
    {
        var columnsJson = columns.Select(column => Column(dataset, column));
        var sortColumn = options.SortColumnName is { } name ? SeedDatasets.ColumnRef(dataset, name) : (Guid?)null;

        return $$"""
            {"type":"dataTable","datasetId":{{options.DatasetIdOverride ?? dataset.Id}},"title":"{{title}}",
             "showTitle":true,"showColumnHeaders":true,"resizableColumns":true,
             "stripedRows":true,"showGridlines":false,"rowHover":true,"density":"compact",
             "paginator":{{SeedJson.Bool(options.Paginator)}},"rowsPerPage":{{options.RowsPerPage}},"emptyMessage":"No rows to display.",
             "showTotals":{{SeedJson.Bool(options.ShowTotals)}},"showSearch":{{SeedJson.Bool(options.ShowSearch)}},
             "frozenColumns":{{options.FrozenColumns}},"rowDetails":{{SeedJson.Bool(options.RowDetails)}},
             "filter":{{options.FilterJson}},
             "columns":[{{string.Join(",", columnsJson)}}],"sortColumnId":{{SeedJson.Guid(sortColumn)}},"sortDirection":"{{options.SortDirection}}"}
            """;
    }

    /// <summary>Optional settings are written only when set, matching what the builder saves.</summary>
    private static string Column(Dataset dataset, TableColumnSeed column)
    {
        var fields = new List<string> { $"\"columnId\":\"{SeedDatasets.ColumnRef(dataset, column.Name)}\"", "\"sortable\":true" };
        AddIf(fields, column.Header is not null, $"\"header\":\"{column.Header}\"");
        AddIf(fields, column.Total is not null, $"\"total\":\"{column.Total}\"");
        AddIf(fields, column.Wrap, "\"wrap\":true");
        AddIf(fields, column.DataBars, "\"dataBars\":true");
        AddIf(fields, column.FormatRulesJson != "[]", $"\"formatRules\":{column.FormatRulesJson}");
        AddIf(fields, column.ToleranceJson != "null", $"\"tolerance\":{column.ToleranceJson}");
        return "{" + string.Join(",", fields) + "}";
    }

    private static void AddIf(List<string> fields, bool include, string field)
    {
        if (include)
        {
            fields.Add(field);
        }
    }
}
