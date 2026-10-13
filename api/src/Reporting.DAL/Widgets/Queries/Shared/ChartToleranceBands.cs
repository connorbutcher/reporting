using Reporting.Abstractions;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Resolves a chart's tolerance bands and projects them for drawing and for the tolerance
/// filter operators — the chart-family queries' (scatter/bar/box-plot/Xbar-R/histogram) shared
/// front end onto <see cref="ToleranceResolver"/>.
/// </summary>
public class ChartToleranceBands(ToleranceResolver tolerance)
{
    /// <summary>Resolves each tolerance band's bounds in one batch, keyed by the band's client id.</summary>
    public async Task<Dictionary<string, ToleranceBounds?>> ResolveAsync(IReadOnlyList<ChartToleranceBand> bands)
    {
        var pointers = bands
            .Where(band => band.SourceDatasetId != 0 && band.SourceRowId != Guid.Empty && band.MinColumnId != Guid.Empty && band.MaxColumnId != Guid.Empty)
            .Select(band => (
                Key: band.Id,
                band.SourceDatasetId,
                band.SourceRowId,
                band.MinColumnId,
                band.MaxColumnId,
                band.ConcessionLowerColumnId,
                band.ConcessionUpperColumnId))
            .ToList();
        return await tolerance.ResolveAsync(pointers);
    }

    /// <summary>Projects resolved band bounds into the client DTOs that draw the reference lines.</summary>
    public static List<ResolvedToleranceBandDto> Resolved(
        IReadOnlyList<ChartToleranceBand> bands,
        IReadOnlyDictionary<string, ToleranceBounds?> bounds) =>
        bands.Select(band => ResolvedBand(band, bounds)).ToList();

    /// <summary>One band's resolved DTO: its drawn bounds when resolution found some, else blank.</summary>
    private static ResolvedToleranceBandDto ResolvedBand(ChartToleranceBand band, IReadOnlyDictionary<string, ToleranceBounds?> bounds)
    {
        bounds.TryGetValue(band.Id, out var bound);
        return new ResolvedToleranceBandDto
        {
            Id = band.Id,
            Axis = band.Axis,
            Min = bound?.Min,
            Max = bound?.Max,
            ConcessionLower = bound?.ConcessionLower,
            ConcessionUpper = bound?.ConcessionUpper,
            Fill = band.Fill,
            OutlinePoints = band.OutlinePoints
        };
    }

    /// <summary>
    /// Maps each tolerance band's bounds onto the axis column it bands, for the tolerance filter
    /// operators. Only an axis carrying exactly one band is included — with several, "out of
    /// tolerance" has no single meaning, so the operator isn't offered (nor resolved) there.
    /// </summary>
    public static Dictionary<Guid, ToleranceBounds?> ByAxisColumn(
        IReadOnlyList<ChartToleranceBand> bands,
        IReadOnlyDictionary<string, ToleranceBounds?> resolved,
        Guid? xColumnId,
        Guid? yColumnId)
    {
        var map = new Dictionary<Guid, ToleranceBounds?>();
        foreach (var axisBands in bands.GroupBy(band => band.Axis))
        {
            var list = axisBands.ToList();
            if (list.Count != 1)
            {
                continue;
            }

            var columnId = axisBands.Key == ChartAxis.Y ? yColumnId : xColumnId;
            if (columnId is { } resolvedColumnId && resolvedColumnId != Guid.Empty)
            {
                map[resolvedColumnId] = resolved.GetValueOrDefault(list[0].Id);
            }
        }
        return map;
    }
}
