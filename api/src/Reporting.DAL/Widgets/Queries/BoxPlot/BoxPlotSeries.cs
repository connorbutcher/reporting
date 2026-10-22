using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

internal static class BoxPlotSeries
{
    /// <summary>One box per ordered category, or a gap where the series has no values, plus each box's outliers.</summary>
    public static BoxPlotSeriesDto Build(
        string seriesKey, List<string> orderedCategoryKeys, Dictionary<(string Category, string Series), List<double>> valuesByKey,
        DatasetColumn? seriesColumn, BoxPlotQueryDto dto)
    {
        var boxes = new List<BoxDto?>(orderedCategoryKeys.Count);
        var outliers = new List<BoxOutlierDto>();
        for (var index = 0; index < orderedCategoryKeys.Count; index++)
        {
            if (!valuesByKey.TryGetValue((orderedCategoryKeys[index], seriesKey), out var values) || values.Count == 0)
            {
                boxes.Add(null);
                continue;
            }

            var (box, groupOutliers) = BoxSummary.Summarise(values, dto.Whisker, dto.WhiskerFactor, dto.IncludePoints);
            boxes.Add(box);
            outliers.AddRange(groupOutliers.Select(value => new BoxOutlierDto { CategoryIndex = index, Value = value }));
        }
        return new BoxPlotSeriesDto
        {
            Label = SeriesLabels.Format(seriesColumn, seriesKey),
            Drill = SeriesLabels.Drill(seriesColumn, seriesKey),
            Boxes = boxes,
            Outliers = outliers
        };
    }

    /// <summary>Each numeric tooltip column averaged over each box's rows, in SQL.</summary>
    public static async Task AddTooltipsAsync(
        List<BoxPlotSeriesDto> series, IQueryable<DatasetRow> matching, ChartCategoryReader reader, int seriesId,
        List<string> orderedCategoryKeys, List<string> orderedSeriesKeys, BoxPlotQueryDto dto,
        Dictionary<Guid, DatasetColumn> columnsByRef, IEnumerable<DatasetColumn> allColumns)
    {
        foreach (var setting in dto.TooltipColumns)
        {
            var column = TooltipColumns.Resolve(setting, columnsByRef, allColumns);
            if (column?.Type is not (DatasetColumnType.Int or DatasetColumnType.Double))
            {
                continue;
            }
            var stats = await BarAggregation.AggregateAsync(matching, reader, new Dictionary<string, ChartCategory>(), false, seriesId, column.Id);
            var tooltip = new List<BarTooltipStats> { new(setting, column, stats) };
            for (var s = 0; s < series.Count; s++)
            {
                for (var c = 0; c < orderedCategoryKeys.Count; c++)
                {
                    series[s].Boxes[c]?.TooltipLines.AddRange(
                        BarTooltips.Lines(tooltip, orderedCategoryKeys[c], orderedSeriesKeys[s], Aggregate.Average));
                }
            }
        }
    }
}
