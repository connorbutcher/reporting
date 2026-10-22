using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Rows shaped for an Xbar-R control chart: filtered, grouped by the subgroup column, and each
/// subgroup's measure values reduced to a mean and a range. The grand mean of the subgroup means
/// and the average subgroup range (pooled only from subgroups of two or more — a lone value has
/// no meaningful range) become the two charts' centre lines; each subgroup's own control limits
/// are then derived from those via the Shewhart constants for its own size, so unequal subgroup
/// sizes still produce statistically correct (if stepped) limits.
/// </summary>
public class XBarRChartQueryService(ReportingDbContext db, ChartToleranceBands toleranceBands, DatasetResolver resolver)
{
    /// <summary>
    /// Ceiling on rows scanned for one Xbar-R query. Like a box plot every value must be pulled to
    /// compute each subgroup's mean and range in memory, so a runaway dataset is capped here.
    /// </summary>
    private const int MaxXBarRScanRows = ScanCapping.MaxScanRows;

    public async Task<XBarRChartQueryResultDto?> QueryForXBarRChartAsync(int id, XBarRChartQueryDto dto)
    {
        var resolved = await resolver.ResolveAsync(id);
        if (resolved is null)
        {
            return null;
        }
        var dataset = resolved.Physical;

        var empty = new XBarRChartQueryResultDto { Id = resolved.Id, Name = resolved.Name };

        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);

        // The band sits on the X-bar (measure) axis; a tolerance filter reuses it to narrow rows
        // by the measure column before they're pooled into subgroups.
        var bounds = await toleranceBands.ResolveAsync(dto.ToleranceBands);
        var toleranceByColumn = ChartToleranceBands.ByAxisColumn(dto.ToleranceBands, bounds, dto.CategoryColumnId, dto.ValueColumnId);
        var operatorCatalogue = await FilterOperators.LoadCatalogueAsync(db);
        var baseRows = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var all = FilterTranslator.Apply(baseRows, resolved.MandatoryFilter, columnsByRef, operatorCatalogue: operatorCatalogue);
        var matching = FilterTranslator.Apply(all, dto.Filter, columnsByRef, toleranceByColumn, operatorCatalogue);
        var (totalRowCount, matchedRowCount) = await RowCounts.CountRowsAsync(all, matching);
        empty.TotalRowCount = totalRowCount;
        empty.MatchedRowCount = matchedRowCount;

        var categoryColumn = columnsByRef.GetValueOrDefault(dto.CategoryColumnId);
        if (categoryColumn is null)
        {
            return empty;
        }
        var reader = new ChartCategoryReader(categoryColumn, dto.CategoryGrouping);

        var valueColumn = columnsByRef.GetValueOrDefault(dto.ValueColumnId);
        if (valueColumn is null)
        {
            return empty;
        }
        var valueId = valueColumn.Id;

        var (projected, truncated, scannedCount) = await ScanAndProjectAsync(matching, reader, valueId);
        if (projected.Count == 0)
        {
            return empty;
        }

        var valuesByCategory = projected
            .GroupBy(p => p.Category)
            .ToDictionary(group => group.Key, group => group.Select(item => item.Value).ToList());
        var categories = projected.Select(p => p.CategoryValue).DistinctBy(c => c.Key).ToDictionary(c => c.Key);

        // The category column's own order first — the same rule a box plot's categories follow.
        var naturalOrder = reader.NaturalOrder(categories.Values).Select(c => c.Key).ToList();
        var sort = dto.Sort ?? new ChartSort();
        var orderedCategoryKeys = await CategorySorting.OrderedCategoryKeysAsync(
            matching, reader, valueId, projected, naturalOrder, sort, columnsByRef);

        // Individuals plot every row as its own point (in subgroup order, then row order); the
        // subgroup charts reduce each category to one point.
        var pointKeys = dto.Mode == ControlChartMode.Individuals
            ? orderedCategoryKeys.SelectMany(key => valuesByCategory[key].Select(_ => key)).ToList()
            : orderedCategoryKeys;
        var stats = dto.Mode == ControlChartMode.Individuals
            ? IndividualStats(orderedCategoryKeys.SelectMany(key => valuesByCategory[key]).ToList())
            : IsAttribute(dto.Mode)
                ? orderedCategoryKeys.Select(key => AttributeStat(valuesByCategory[key], dto.Mode)).ToList()
                : orderedCategoryKeys.Select(key => SubgroupStat(valuesByCategory[key], dto.Mode)).ToList();

        // The centre lines (and so every limit) come from the baseline points only, when one is
        // set, and are then held across the whole chart.
        var baseline = dto.BaselineSubgroups is > 0 and var n && n < stats.Count ? n : (int?)null;
        var basis = baseline is { } count ? stats.Take(count).ToList() : stats;

        List<XBarRSubgroupDto> subgroups;
        List<double> centers;
        double xBarBar;
        double dispersionBar;
        if (IsAttribute(dto.Mode))
        {
            // The overall defective rate p̄ = total defectives / total units (not the mean of the
            // subgroup rates, which would over-weight small subgroups).
            var units = basis.Sum(stat => stat.Count);
            var pBar = units > 0 ? basis.Sum(stat => stat.Dispersion) / units : 0d;
            subgroups = stats.Select(stat => BuildAttributeSubgroup(stat, pBar, dto.Mode)).ToList();
            centers = stats.Select(stat => dto.Mode == ControlChartMode.Np ? stat.Count * pBar : pBar).ToList();
            xBarBar = dto.Mode == ControlChartMode.Np ? basis.Average(stat => stat.Count) * pBar : pBar;
            dispersionBar = 0;
        }
        else
        {
            xBarBar = basis.Average(stat => stat.Mean);
            // A subgroup of one has no spread of its own (and the first individual no moving range), so
            // only points that have one contribute to the average — including them would bias it low.
            var spread = basis.Where(stat => stat.HasDispersion).ToList();
            dispersionBar = spread.Count > 0 ? spread.Average(stat => stat.Dispersion) : 0d;
            subgroups = stats.Select(stat => BuildSubgroup(stat, xBarBar, dispersionBar, dto.Mode)).ToList();
            centers = stats.Select(_ => xBarBar).ToList();
        }
        ApplyRules(subgroups, centers, dispersionBar, dto.RunRules);

        return new XBarRChartQueryResultDto
        {
            Id = resolved.Id,
            Name = resolved.Name,
            Categories = pointKeys.Select(key => reader.Label(categories[key])).ToList(),
            CategoryDetails = pointKeys.Select(key => reader.Detail(categories[key])).ToList(),
            Subgroups = subgroups,
            XBarCenterLine = xBarBar,
            RCenterLine = dispersionBar,
            Mode = dto.Mode,
            BaselineCount = baseline,
            ToleranceBands = ChartToleranceBands.Resolved(dto.ToleranceBands, bounds),
            TotalRowCount = totalRowCount,
            MatchedRowCount = matchedRowCount,
            Truncated = truncated,
            ScannedRowCount = scannedCount
        };
    }

    /// <summary>One plotted point before its limits: its mean (or value), its dispersion (range, σ or moving range), and its size.</summary>
    private readonly record struct PointStat(double Mean, double Dispersion, int Count, bool HasDispersion);

    /// <summary>
    /// Pulls only the cells each subgroup needs — the category cell (its three typed forms fetched
    /// together in one subquery, not three) and the measure — then pivots them in memory. Only
    /// rows carrying a numeric measure can feed a subgroup; a subgroup with none simply doesn't
    /// appear, matching box plot's behaviour. Capped so a runaway dataset can't be pulled wholesale
    /// into memory.
    /// </summary>
    private static async Task<(List<GroupedValueProjection> Projected, bool Truncated, int ScannedCount)> ScanAndProjectAsync(
        IQueryable<DatasetRow> matching, ChartCategoryReader reader, int valueId)
    {
        var categoryId = reader.Column.Id;
        var scanned = await CellPivot.Of(matching, categoryId, valueId)
            .Where(p => p.N1 != null)
            .OrderBy(p => p.RowId)
            .Take(MaxXBarRScanRows + 1)
            .Select(p => new { p.T0, p.N0, p.D0, Value = p.N1 })
            .ToListAsync();

        var truncated = ScanCapping.TrimToScanCap(scanned, MaxXBarRScanRows);

        var projected = scanned
            .Select(r => new GroupedValueProjection
            {
                CategoryValue = reader.Read(r.T0, r.N0, r.D0),
                Value = r.Value ?? 0d
            })
            .ToList();

        return (projected, truncated, scanned.Count);
    }

    /// <summary>One subgroup's mean and dispersion — its range (max − min) or, for Xbar-S, its sample σ.</summary>
    private static PointStat SubgroupStat(List<double> values, ControlChartMode mode)
    {
        var mean = values.Average();
        var dispersion = mode == ControlChartMode.XBarS ? Statistics.StdDev(values, mean) : values.Max() - values.Min();
        return new PointStat(mean, dispersion, values.Count, values.Count >= 2);
    }

    private static bool IsAttribute(ControlChartMode mode) => mode is ControlChartMode.P or ControlChartMode.Np;

    /// <summary>
    /// One subgroup of an attribute chart: any non-zero value is a defective unit. The plotted value
    /// is the defective proportion (p) or count (np); the defective count rides in the dispersion slot,
    /// which an attribute chart has no other use for, so p̄ can be pooled from counts.
    /// </summary>
    private static PointStat AttributeStat(List<double> values, ControlChartMode mode)
    {
        var defective = values.Count(value => value != 0);
        var plotted = mode == ControlChartMode.Np ? defective : (double)defective / values.Count;
        return new PointStat(plotted, defective, values.Count, false);
    }

    /// <summary>
    /// An attribute subgroup's limits from the binomial σ for its own size n: p̄ ± 3√(p̄(1−p̄)/n) for
    /// a p chart, np̄ ± 3√(np̄(1−p̄)) for an np chart, the lower limit floored at zero (and a p chart's
    /// upper at one). Limits step with n, like the Xbar-R limits do for unequal subgroups.
    /// </summary>
    private static XBarRSubgroupDto BuildAttributeSubgroup(PointStat stat, double pBar, ControlChartMode mode)
    {
        var n = stat.Count;
        double center, spread, upperCap;
        if (mode == ControlChartMode.Np)
        {
            center = n * pBar;
            spread = 3 * Math.Sqrt(n * pBar * (1 - pBar));
            upperCap = n;
        }
        else
        {
            center = pBar;
            spread = 3 * Math.Sqrt(pBar * (1 - pBar) / n);
            upperCap = 1;
        }
        var ucl = Math.Min(center + spread, upperCap);
        var lcl = Math.Max(center - spread, 0);
        return new XBarRSubgroupDto
        {
            Mean = stat.Mean,
            Range = 0,
            Count = n,
            HasRange = false,
            XBarUcl = ucl,
            XBarLcl = lcl,
            RUcl = 0,
            RLcl = 0,
            MeanOutOfControl = stat.Mean > ucl || stat.Mean < lcl,
            RangeOutOfControl = false
        };
    }

    /// <summary>Individual values with their moving ranges |xᵢ − xᵢ₋₁|; the first has none.</summary>
    private static List<PointStat> IndividualStats(List<double> values) =>
        values.Select((value, i) => new PointStat(value, i == 0 ? 0 : Math.Abs(value - values[i - 1]), 1, i > 0)).ToList();

    /// <summary>
    /// One point's control-limit verdict: the chart's constants (by subgroup size, for the subgroup
    /// charts) applied to the shared centre lines, and whether its value or dispersion breaches them.
    /// </summary>
    private static XBarRSubgroupDto BuildSubgroup(PointStat stat, double xBarBar, double dispersionBar, ControlChartMode mode)
    {
        double xSpread, dLcl, dUcl;
        switch (mode)
        {
            case ControlChartMode.Individuals:
                xSpread = ControlChartConstants.IndividualsE2 * dispersionBar;
                dLcl = 0;
                dUcl = ControlChartConstants.MovingRangeD4 * dispersionBar;
                break;
            case ControlChartMode.XBarS:
                var (a3, b3, b4) = ControlChartConstants.LookupS(stat.Count);
                xSpread = a3 * dispersionBar;
                dLcl = b3 * dispersionBar;
                dUcl = b4 * dispersionBar;
                break;
            default:
                var (a2, d3, d4) = ControlChartConstants.Lookup(stat.Count);
                xSpread = a2 * dispersionBar;
                dLcl = d3 * dispersionBar;
                dUcl = d4 * dispersionBar;
                break;
        }
        var xUcl = xBarBar + xSpread;
        var xLcl = xBarBar - xSpread;
        return new XBarRSubgroupDto
        {
            Mean = stat.Mean,
            Range = stat.Dispersion,
            Count = stat.Count,
            HasRange = stat.HasDispersion,
            XBarUcl = xUcl,
            XBarLcl = xLcl,
            RUcl = dUcl,
            RLcl = dLcl,
            MeanOutOfControl = stat.Mean > xUcl || stat.Mean < xLcl,
            RangeOutOfControl = stat.HasDispersion && (stat.Dispersion > dUcl || stat.Dispersion < dLcl)
        };
    }

    /// <summary>Flags each point's broken Nelson rules on both charts — rule 1 always, the run rules when asked.</summary>
    private static void ApplyRules(List<XBarRSubgroupDto> subgroups, List<double> centers, double dispersionBar, bool runRules)
    {
        // Each point is judged against its own centre line: the grand mean, or for an np chart its
        // own n·p̄ — never the midpoint of its limits, which moves once a limit is floored at zero.
        var meanRules = ControlChartRules.Evaluate(
            subgroups.Select((s, i) => new ControlChartRules.Point(s.Mean, centers[i], s.XBarUcl, s.XBarLcl)).ToList(),
            runRules);
        var rangeRules = ControlChartRules.Evaluate(
            subgroups.Select(s => new ControlChartRules.Point(
                s.HasRange ? s.Range : null,
                dispersionBar,
                s.RUcl,
                s.RLcl)).ToList(),
            runRules);
        for (var i = 0; i < subgroups.Count; i++)
        {
            subgroups[i].MeanRules = meanRules[i];
            subgroups[i].RangeRules = rangeRules[i];
            // Out of control now means any rule broken, so highlighting follows the run rules too.
            subgroups[i].MeanOutOfControl = meanRules[i].Count > 0;
            subgroups[i].RangeOutOfControl = rangeRules[i].Count > 0;
        }
    }
}
