using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

internal static class HistogramSeries
{
    /// <summary>One series per distinct series key in the measure's values, each binned into the shared edges.</summary>
    public static IEnumerable<HistogramSeriesDto> ForMeasure(
        HistogramMeasureValues measure, List<double> edges, int binCount, double binWidth, HistogramQueryDto dto, DatasetColumn? seriesColumn)
    {
        return measure.Projected
            .Select(p => p.Series)
            .Distinct()
            .OrderBy(series => series, StringComparer.OrdinalIgnoreCase)
            .Select(seriesKey =>
            {
                var seriesDto = Build(seriesKey, measure.Projected, edges, binCount, binWidth, dto, seriesColumn);
                seriesDto.ValueColumnId = measure.Column.RefId;
                seriesDto.ValueColumnLabel = measure.Column.Name;
                return seriesDto;
            });
    }

    /// <summary>Each bin's count, shown raw, as a share of the series' total, or as a density, optionally accumulated.</summary>
    private static HistogramSeriesDto Build(
        string seriesKey, List<(string Series, double Value)> projected, List<double> edges, int binCount, double binWidth,
        HistogramQueryDto dto, DatasetColumn? seriesColumn)
    {
        var counts = new double[binCount];
        var seriesValues = new List<double>();
        foreach (var (key, value) in projected)
        {
            if (key != seriesKey)
            {
                continue;
            }
            counts[HistogramBinning.Index(value, edges, binCount)]++;
            seriesValues.Add(value);
        }
        var total = seriesValues.Count;
        var mean = total > 0 ? seriesValues.Average() : 0d;

        return new HistogramSeriesDto
        {
            Key = seriesKey,
            Label = SeriesLabels.Format(seriesColumn, seriesKey),
            Drill = SeriesLabels.Drill(seriesColumn, seriesKey),
            Values = Heights(counts, total, binWidth, dto),
            Mean = mean,
            StdDev = Statistics.StdDev(seriesValues, mean),
            Count = total
        };
    }

    private static List<double> Heights(double[] counts, int total, double binWidth, HistogramQueryDto dto)
    {
        var values = new List<double>(counts.Length);
        var running = 0d;
        foreach (var count in counts)
        {
            var shown = dto.Normalize switch
            {
                HistogramNormalize.Frequency => total > 0 ? count / total : 0,
                HistogramNormalize.Density => total > 0 && binWidth > 0 ? count / (total * binWidth) : 0,
                _ => count
            };
            running += shown;
            values.Add(dto.Cumulative ? running : shown);
        }
        return values;
    }
}
