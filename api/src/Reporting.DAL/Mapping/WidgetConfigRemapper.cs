using System.Text.Json;
using Reporting.Abstractions;

namespace Reporting.DAL;

public static class WidgetConfigRemapper
{
    /// <summary>
    /// Rewrites the dataset ids a widget config references through <paramref name="map"/>, for a revision
    /// copy whose datasets get new ids. Ids absent from the map are left untouched.
    /// </summary>
    public static string RemapDatasetIds(string configJson, IReadOnlyDictionary<int, int> map)
    {
        var config = JsonSerializer.Deserialize<WidgetConfig>(configJson, ConfigJson.Options)!;

        switch (config)
        {
            case DataTableWidgetConfig table:
                table.DatasetId = RemapOptional(map, table.DatasetId);
                foreach (var column in table.Columns)
                {
                    if (column.Tolerance is { } tolerance)
                    {
                        tolerance.SourceDatasetId = RemapRequired(map, tolerance.SourceDatasetId);
                    }
                }

                break;
            case ChartWidgetConfig chart:
                foreach (var binding in chart.Bindings)
                {
                    binding.DatasetId = RemapOptional(map, binding.DatasetId);
                }

                foreach (var band in chart.ToleranceBands)
                {
                    band.SourceDatasetId = RemapRequired(map, band.SourceDatasetId);
                }

                break;
            case PivotTableWidgetConfig pivot:
                pivot.DatasetId = RemapOptional(map, pivot.DatasetId);
                break;
            case KpiWidgetConfig kpi:
                kpi.DatasetId = RemapOptional(map, kpi.DatasetId);
                if (kpi.Tolerance is { } kpiTolerance)
                {
                    kpiTolerance.SourceDatasetId = RemapRequired(map, kpiTolerance.SourceDatasetId);
                }

                break;
        }

        return JsonSerializer.Serialize(config, typeof(WidgetConfig), ConfigJson.Options);
    }

    private static int? RemapOptional(IReadOnlyDictionary<int, int> map, int? id)
    {
        return id is { } v && map.TryGetValue(v, out var mapped) ? mapped : id;
    }

    private static int RemapRequired(IReadOnlyDictionary<int, int> map, int id)
    {
        return map.TryGetValue(id, out var mapped) ? mapped : id;
    }
}
