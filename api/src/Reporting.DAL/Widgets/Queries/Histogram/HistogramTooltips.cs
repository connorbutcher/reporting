using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>Each numeric tooltip column averaged over the rows in each bin of each series.</summary>
internal static class HistogramTooltips
{
    public static async Task ApplyAsync(
        IQueryable<DatasetRow> matching, HistogramQueryDto dto, List<DatasetColumn> measures, List<HistogramSeriesDto> series,
        int seriesId, List<double> edges, int binCount, (double Min, double Max)? range,
        Dictionary<Guid, DatasetColumn> columnsByRef, IEnumerable<DatasetColumn> allColumns)
    {
        foreach (var setting in dto.TooltipColumns)
        {
            var column = BarChartQueryService.ResolveTooltipColumn(setting, columnsByRef, allColumns);
            if (column?.Type is not (DatasetColumnType.Int or DatasetColumnType.Double))
            {
                continue;
            }
            foreach (var measure in measures)
            {
                var totals = await HistogramScan.BinTotalsAsync(matching, seriesId, measure.Id, column.Id, edges, binCount, range);
                foreach (var seriesDto in series.Where(s => s.ValueColumnId == measure.RefId))
                {
                    AddLines(seriesDto, totals.GetValueOrDefault(seriesDto.Key), binCount, setting, column);
                }
            }
        }
    }

    private static void AddLines(
        HistogramSeriesDto seriesDto, (double Sum, int Count)[]? perBin, int binCount, ChartTooltipColumn setting, DatasetColumn column)
    {
        if (seriesDto.TooltipLines.Count == 0)
        {
            seriesDto.TooltipLines = Enumerable.Range(0, binCount).Select(_ => new List<string>()).ToList();
        }
        for (var b = 0; b < binCount; b++)
        {
            if (perBin is not null && perBin[b].Count > 0)
            {
                var formatted = CellFormatter.Number(perBin[b].Sum / perBin[b].Count, column.GetConfig() as NumericColumnConfig);
                seriesDto.TooltipLines[b].Add($"{setting.Prefix}{formatted}{setting.Suffix}");
            }
        }
    }
}
