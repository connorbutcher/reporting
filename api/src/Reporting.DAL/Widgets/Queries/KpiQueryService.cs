using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// One headline number reduced from a dataset: either a plain aggregate over a column, or the
/// count/percent of rows failing a tolerance band (reusing <see cref="ToleranceResolver"/>, the same
/// classification the table widget bands its cells with). Optionally compared against a fixed target
/// or the previous rolling period — in which case both figures are computed over their own date
/// window rather than over the whole filtered set, so the comparison is apples-to-apples.
///
/// Three further reductions share the same two pure reducers (<see cref="ReduceAggregate"/> /
/// <see cref="ReduceTolerance"/>) the single-value path uses, just applied to a different slice of
/// rows: a trailing sparkline history (one value per <see cref="KpiQueryDto.PeriodDays"/>-wide
/// bucket), and a grouped reduction (one value per distinct value of a dimension column).
/// </summary>
public class KpiQueryService(ReportingDbContext db, ToleranceResolver tolerance, DatasetResolver resolver)
{
    /// <summary>Ceiling on rows scanned to reduce one KPI value — every row must be pulled into memory
    /// to aggregate or tolerance-classify it, same reasoning as <c>PivotQueryService</c>.</summary>
    private const int MaxKpiScanRows = 200_000;

    /// <summary>A resolved tolerance band, ready to classify rows against — resolved once per query
    /// (not once per bucket/group) since the pointer and its bounds don't vary across them.</summary>
    private sealed record ToleranceContext(
        DatasetColumn ValueColumn, DatasetColumn? MatchColumn, ToleranceBounds? FixedBounds, MatchedLimits? MatchedLimits);

    public async Task<KpiQueryResultDto?> QueryForKpiAsync(int id, KpiQueryDto dto)
    {
        var resolved = await resolver.ResolveAsync(id);
        if (resolved is null)
        {
            return null;
        }
        var dataset = resolved.Physical;

        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);
        var operatorCatalogue = await FilterOperators.LoadCatalogueAsync(db);
        var baseRows = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var all = FilterTranslator.Apply(baseRows, resolved.MandatoryFilter, columnsByRef, operatorCatalogue: operatorCatalogue);
        var matching = FilterTranslator.Apply(all, dto.Filter, columnsByRef, operatorCatalogue: operatorCatalogue);

        var result = new KpiQueryResultDto();
        var (totalRowCount, filteredRowCount) = await RowCounts.CountRowsAsync(all, matching);
        result.TotalRowCount = totalRowCount;

        // `today` is captured once into a local so EF treats it as a constant it can translate to
        // SQL, rather than re-evaluating a clock call per row (same quirk DateConditionTranslator
        // works around for the relative date filter operators) — and so every reduction below (the
        // current/previous windows, the sparkline buckets) agrees on the same "now".
        var today = DateTime.UtcNow.Date;

        // A grouped KPI supersedes the single-value fields entirely — like a pivot's Rows supersede
        // a flat value — so it short-circuits before the comparison/trend/sparkline logic below,
        // none of which has a per-tile equivalent in this slice.
        if (dto.GroupByColumnId is { } groupRef && columnsByRef.TryGetValue(groupRef, out var groupColumn))
        {
            var (groups, groupsTruncated) = await ComputeGroupsAsync(dto, matching, columnsByRef, groupColumn);
            result.Groups = groups;
            result.MatchedRowCount = filteredRowCount;
            result.Truncated = groupsTruncated;
            return result;
        }

        if (dto.ComparisonMode == KpiComparisonMode.PreviousPeriod
            && dto.DateColumnId is { } dateRef
            && columnsByRef.TryGetValue(dateRef, out var dateColumn))
        {
            // Rolling windows, not calendar-aligned weeks/months: "last N days" vs the N days before that.
            var currentStart = today.AddDays(-dto.PeriodDays);
            var previousStart = today.AddDays(-2 * dto.PeriodDays);

            var currentRows = WithDateWindow(matching, dateColumn.Id, currentStart, today.AddDays(1));
            var previousRows = WithDateWindow(matching, dateColumn.Id, previousStart, currentStart);

            var current = await ComputeValueAsync(dto, currentRows, columnsByRef);
            var previous = await ComputeValueAsync(dto, previousRows, columnsByRef);

            result.Value = current.Value;
            result.ComparisonValue = previous.Value;
            result.MatchedRowCount = await currentRows.CountAsync();
            result.Truncated = current.Truncated || previous.Truncated;
        }
        else
        {
            var current = await ComputeValueAsync(dto, matching, columnsByRef);
            result.Value = current.Value;
            result.ComparisonValue = dto.ComparisonMode == KpiComparisonMode.FixedTarget ? dto.TargetValue : null;
            result.MatchedRowCount = filteredRowCount;
            result.Truncated = current.Truncated;
        }

        ApplyFormattingAndTrend(result, dto);
        result.Status = ClassifyStatus(result.Value, dto);

        if (dto.ShowSparkline && dto.DateColumnId is { } sparkDateRef && columnsByRef.TryGetValue(sparkDateRef, out var sparkDateColumn))
        {
            result.History = await ComputeHistoryAsync(dto, matching, columnsByRef, sparkDateColumn, today);
        }

        return result;
    }

    private static IQueryable<DatasetRow> WithDateWindow(
        IQueryable<DatasetRow> rows, int dateColumnId, DateTime startInclusive, DateTime endExclusive) =>
        rows.Where(r => r.Cells.Any(c => c.ColumnId == dateColumnId && c.DateValue >= startInclusive && c.DateValue < endExclusive));

    private async Task<(double? Value, bool Truncated)> ComputeValueAsync(
        KpiQueryDto dto, IQueryable<DatasetRow> rows, Dictionary<Guid, DatasetColumn> columnsByRef) =>
        dto.ValueSource switch
        {
            KpiValueSource.ToleranceOutOfLimits => await ComputeToleranceAsync(dto, rows, columnsByRef),
            _ => await ComputeAggregateAsync(dto, rows, columnsByRef),
        };

    private async Task<(double? Value, bool Truncated)> ComputeAggregateAsync(
        KpiQueryDto dto, IQueryable<DatasetRow> rows, Dictionary<Guid, DatasetColumn> columnsByRef)
    {
        if (dto.Aggregate == Aggregate.Count)
        {
            return (await rows.CountAsync(), false);
        }

        if (dto.ValueColumnId is not { } colRef || !columnsByRef.TryGetValue(colRef, out var column))
        {
            return (null, false);
        }

        var scanned = await rows
            .OrderBy(r => r.Id)
            .Take(MaxKpiScanRows + 1)
            .Select(r => r.Cells.FirstOrDefault(c => c.ColumnId == column.Id)!.NumberValue)
            .ToListAsync();
        var truncated = ScanCapping.TrimToScanCap(scanned, MaxKpiScanRows);

        return (ReduceAggregate(scanned, dto.Aggregate), truncated);
    }

    private async Task<(double? Value, bool Truncated)> ComputeToleranceAsync(
        KpiQueryDto dto, IQueryable<DatasetRow> rows, Dictionary<Guid, DatasetColumn> columnsByRef)
    {
        if (await ResolveToleranceContextAsync(dto, columnsByRef) is not { } ctx)
        {
            return (null, false);
        }

        var neededColumnIds = new HashSet<int> { ctx.ValueColumn.Id };
        if (ctx.MatchColumn is not null)
        {
            neededColumnIds.Add(ctx.MatchColumn.Id);
        }

        var scanned = await rows
            .OrderBy(r => r.Id)
            .Take(MaxKpiScanRows + 1)
            .Include(r => r.Cells.Where(c => neededColumnIds.Contains(c.ColumnId)))
            .AsNoTracking()
            .ToListAsync();
        var truncated = ScanCapping.TrimToScanCap(scanned, MaxKpiScanRows);

        var value = ReduceTolerance(scanned, ctx, dto.ToleranceStatusMode, dto.ShowAsPercent);
        return (value, truncated);
    }

    /// <summary>Resolves a tolerance config's pointer once — reused across the single-value, history, and grouped paths.</summary>
    private async Task<ToleranceContext?> ResolveToleranceContextAsync(KpiQueryDto dto, Dictionary<Guid, DatasetColumn> columnsByRef)
    {
        if (dto.Tolerance is not { } config
            || dto.ValueColumnId is not { } colRef
            || !columnsByRef.TryGetValue(colRef, out var column))
        {
            return null;
        }

        if (config.Match is { } match)
        {
            var resolved = await tolerance.ResolveMatchedAsync(new[]
            {
                (Key: "kpi", config.SourceDatasetId, MatchColumnId: match.SourceColumnId,
                    config.MinColumnId, config.MaxColumnId,
                    config.ConcessionLowerColumnId, config.ConcessionUpperColumnId),
            });
            columnsByRef.TryGetValue(match.ColumnId, out var matchColumn);
            return new ToleranceContext(column, matchColumn, null, resolved["kpi"]);
        }

        if (config.SourceRowId is { } sourceRowId)
        {
            var resolved = await tolerance.ResolveAsync(new[]
            {
                (Key: "kpi", config.SourceDatasetId, SourceRowId: sourceRowId,
                    config.MinColumnId, config.MaxColumnId,
                    config.ConcessionLowerColumnId, config.ConcessionUpperColumnId),
            });
            return new ToleranceContext(column, null, resolved["kpi"], null);
        }

        return null;
    }

    /// <summary>The pure aggregate reduction — Sum/Average/Min/Max over whatever slice of values it's handed (the whole dataset, one period bucket, or one group). Null when nothing was there to reduce.</summary>
    private static double? ReduceAggregate(IReadOnlyList<double?> values, Aggregate aggregate)
    {
        var present = values.Where(v => v.HasValue).Select(v => v!.Value).ToList();
        if (present.Count == 0)
        {
            return null;
        }

        return aggregate switch
        {
            Aggregate.Sum => present.Sum(),
            Aggregate.Average => present.Average(),
            Aggregate.Min => present.Min(),
            Aggregate.Max => present.Max(),
            _ => present.Sum(),
        };
    }

    /// <summary>The pure tolerance reduction — classifies whatever slice of rows it's handed against an already-resolved band, and tallies the failing share. Null when none of the rows had a value to classify.</summary>
    private static double? ReduceTolerance(
        IReadOnlyList<DatasetRow> rows, ToleranceContext ctx, KpiToleranceStatusMode statusMode, bool showAsPercent)
    {
        var total = 0;
        var failing = 0;
        foreach (var row in rows)
        {
            if (row.Cells.FirstOrDefault(c => c.ColumnId == ctx.ValueColumn.Id)?.NumberValue is not { } value)
            {
                continue;
            }

            var bounds = ctx.MatchColumn is not null
                ? ctx.MatchedLimits!.For(row.Cells.FirstOrDefault(c => c.ColumnId == ctx.MatchColumn.Id))
                : ctx.FixedBounds;

            total++;
            var status = ToleranceResolver.Classify(value, bounds);
            if (status == ToleranceStatus.Fail
                || (statusMode == KpiToleranceStatusMode.FailOrConcession && status == ToleranceStatus.Concession))
            {
                failing++;
            }
        }

        if (total == 0)
        {
            return null;
        }

        return showAsPercent ? 100.0 * failing / total : failing;
    }

    /// <summary>
    /// A trailing history of the KPI's value, one point per <see cref="KpiQueryDto.PeriodDays"/>-wide
    /// bucket going back <see cref="KpiQueryDto.SparklinePeriods"/> periods, oldest first. One scan
    /// across the whole span (rather than one query per bucket), bucketed in memory by how many
    /// periods back each row's date falls — the same shape the single-value reductions already use,
    /// just split across <c>SparklinePeriods</c> groups instead of one.
    /// </summary>
    private async Task<List<KpiHistoryPointDto>> ComputeHistoryAsync(
        KpiQueryDto dto, IQueryable<DatasetRow> matching, Dictionary<Guid, DatasetColumn> columnsByRef,
        DatasetColumn dateColumn, DateTime today)
    {
        var periods = Math.Clamp(dto.SparklinePeriods, 1, 52);

        ToleranceContext? toleranceCtx = dto.ValueSource == KpiValueSource.ToleranceOutOfLimits
            ? await ResolveToleranceContextAsync(dto, columnsByRef)
            : null;
        if (dto.ValueSource == KpiValueSource.ToleranceOutOfLimits && toleranceCtx is null)
        {
            return [];
        }

        DatasetColumn? valueColumn = dto.ValueSource == KpiValueSource.Aggregate
            && dto.Aggregate != Aggregate.Count
            && dto.ValueColumnId is { } colRef
                ? columnsByRef.GetValueOrDefault(colRef)
                : null;

        var neededColumnIds = new HashSet<int> { dateColumn.Id };
        if (valueColumn is not null)
        {
            neededColumnIds.Add(valueColumn.Id);
        }
        if (toleranceCtx is { } ctx)
        {
            neededColumnIds.Add(ctx.ValueColumn.Id);
            if (ctx.MatchColumn is not null)
            {
                neededColumnIds.Add(ctx.MatchColumn.Id);
            }
        }

        var earliestStart = today.AddDays(-periods * dto.PeriodDays);
        var windowed = WithDateWindow(matching, dateColumn.Id, earliestStart, today.AddDays(1));
        var scanned = await windowed
            .OrderBy(r => r.Id)
            .Take(MaxKpiScanRows + 1)
            .Include(r => r.Cells.Where(c => neededColumnIds.Contains(c.ColumnId)))
            .AsNoTracking()
            .ToListAsync();
        ScanCapping.TrimToScanCap(scanned, MaxKpiScanRows);

        // Bucket index 0 is the most recent period, counting up as it goes further back — the mirror
        // image of the output order, which reads oldest to newest.
        var buckets = new Dictionary<int, List<DatasetRow>>();
        foreach (var row in scanned)
        {
            if (row.Cells.FirstOrDefault(c => c.ColumnId == dateColumn.Id)?.DateValue is not { } date)
            {
                continue;
            }
            var index = (int)Math.Floor((today - date).TotalDays / dto.PeriodDays);
            if (index < 0 || index >= periods)
            {
                continue;
            }
            if (!buckets.TryGetValue(index, out var bucketRows))
            {
                buckets[index] = bucketRows = new List<DatasetRow>();
            }
            bucketRows.Add(row);
        }

        var points = new List<KpiHistoryPointDto>(periods);
        for (var index = periods - 1; index >= 0; index--)
        {
            var periodStart = today.AddDays(-(index + 1) * dto.PeriodDays);
            double? value = null;
            if (buckets.TryGetValue(index, out var bucketRows))
            {
                value = ReduceBucket(bucketRows, dto, toleranceCtx, valueColumn);
            }
            points.Add(new KpiHistoryPointDto { PeriodStart = periodStart, Value = value });
        }
        return points;
    }

    /// <summary>
    /// A grouped KPI: one reduced value per distinct value of <paramref name="groupColumn"/>, ordered
    /// by that value's display label and capped at <see cref="KpiQueryDto.MaxGroups"/>. Mirrors
    /// <c>PivotQueryService</c>'s row-pulling and in-memory grouping, but reduces each group through
    /// the same aggregate/tolerance reducers the single-value KPI uses (<c>PivotMeasureAcc</c> is
    /// aggregate-only and has no tolerance-classification concept, so it isn't reused here).
    /// </summary>
    private async Task<(List<KpiGroupResultDto> Groups, bool Truncated)> ComputeGroupsAsync(
        KpiQueryDto dto, IQueryable<DatasetRow> rows, Dictionary<Guid, DatasetColumn> columnsByRef, DatasetColumn groupColumn)
    {
        ToleranceContext? toleranceCtx = dto.ValueSource == KpiValueSource.ToleranceOutOfLimits
            ? await ResolveToleranceContextAsync(dto, columnsByRef)
            : null;
        if (dto.ValueSource == KpiValueSource.ToleranceOutOfLimits && toleranceCtx is null)
        {
            return ([], false);
        }

        DatasetColumn? valueColumn = dto.ValueSource == KpiValueSource.Aggregate
            && dto.Aggregate != Aggregate.Count
            && dto.ValueColumnId is { } colRef
                ? columnsByRef.GetValueOrDefault(colRef)
                : null;

        var neededColumnIds = new HashSet<int> { groupColumn.Id };
        if (valueColumn is not null)
        {
            neededColumnIds.Add(valueColumn.Id);
        }
        if (toleranceCtx is { } ctx)
        {
            neededColumnIds.Add(ctx.ValueColumn.Id);
            if (ctx.MatchColumn is not null)
            {
                neededColumnIds.Add(ctx.MatchColumn.Id);
            }
        }

        var scanned = await rows
            .OrderBy(r => r.Id)
            .Take(MaxKpiScanRows + 1)
            .Include(r => r.Cells.Where(c => neededColumnIds.Contains(c.ColumnId)))
            .AsNoTracking()
            .ToListAsync();
        var scanTruncated = ScanCapping.TrimToScanCap(scanned, MaxKpiScanRows);

        var groups = new Dictionary<string, List<DatasetRow>>();
        foreach (var row in scanned)
        {
            var cell = row.Cells.FirstOrDefault(c => c.ColumnId == groupColumn.Id);
            var label = DimensionDisplay(cell, groupColumn);
            if (!groups.TryGetValue(label, out var groupRows))
            {
                groups[label] = groupRows = new List<DatasetRow>();
            }
            groupRows.Add(row);
        }

        var maxGroups = Math.Clamp(dto.MaxGroups, 1, 200);
        var ordered = groups.OrderBy(g => g.Key, StringComparer.OrdinalIgnoreCase).ToList();
        var groupsTruncated = ordered.Count > maxGroups;

        var results = ordered.Take(maxGroups).Select(entry =>
        {
            var value = ReduceBucket(entry.Value, dto, toleranceCtx, valueColumn);
            return new KpiGroupResultDto
            {
                Label = entry.Key,
                Value = value,
                DisplayValue = Format(value, dto),
                Status = ClassifyStatus(value, dto),
            };
        }).ToList();

        return (results, scanTruncated || groupsTruncated);
    }

    /// <summary>One bucket's (one period's, or one group's) value — the same reduction the single-value path uses, applied to an already-materialized row slice.</summary>
    private static double? ReduceBucket(
        IReadOnlyList<DatasetRow> rows, KpiQueryDto dto, ToleranceContext? toleranceCtx, DatasetColumn? valueColumn)
    {
        if (dto.ValueSource == KpiValueSource.ToleranceOutOfLimits)
        {
            return toleranceCtx is { } ctx ? ReduceTolerance(rows, ctx, dto.ToleranceStatusMode, dto.ShowAsPercent) : null;
        }

        if (dto.Aggregate == Aggregate.Count)
        {
            return rows.Count;
        }

        if (valueColumn is null)
        {
            return null;
        }

        var values = rows.Select(r => r.Cells.FirstOrDefault(c => c.ColumnId == valueColumn.Id)?.NumberValue).ToList();
        return ReduceAggregate(values, dto.Aggregate);
    }

    /// <summary>A dimension cell's display string — its formatted value, blank collapsed to "(blank)", mirroring <c>PivotQueryService</c>'s own.</summary>
    private static string DimensionDisplay(DatasetCell? cell, DatasetColumn column)
    {
        var display = cell is null ? null : CellFormatter.Format(cell, column.Type, column.GetConfig());
        return string.IsNullOrEmpty(display) ? "(blank)" : display;
    }

    /// <summary>Where the value sits against the configured thresholds — direction-aware, independent of the trend/comparison.</summary>
    private static KpiStatus ClassifyStatus(double? value, KpiQueryDto dto)
    {
        if (!dto.ThresholdsEnabled || value is not { } v)
        {
            return KpiStatus.None;
        }

        bool Breaches(double? threshold) => threshold is { } t
            && (dto.Direction == KpiDirection.LowerIsBetter ? v >= t : v <= t);

        if (Breaches(dto.CriticalThreshold))
        {
            return KpiStatus.Critical;
        }
        if (Breaches(dto.WarningThreshold))
        {
            return KpiStatus.Warning;
        }
        return KpiStatus.Good;
    }

    private static void ApplyFormattingAndTrend(KpiQueryResultDto result, KpiQueryDto dto)
    {
        result.DisplayValue = Format(result.Value, dto);
        result.ComparisonDisplayValue = Format(result.ComparisonValue, dto);

        if (result.Value is not { } value || result.ComparisonValue is not { } comparison)
        {
            return;
        }

        var delta = value - comparison;
        result.Delta = delta;
        result.DeltaPercent = comparison != 0 ? 100.0 * delta / Math.Abs(comparison) : null;

        result.Trend = delta switch
        {
            > 0 => KpiTrend.Up,
            < 0 => KpiTrend.Down,
            _ => KpiTrend.Flat,
        };

        result.Sentiment = result.Trend switch
        {
            KpiTrend.Up => dto.Direction == KpiDirection.HigherIsBetter ? KpiTrendSentiment.Good : KpiTrendSentiment.Bad,
            KpiTrend.Down => dto.Direction == KpiDirection.LowerIsBetter ? KpiTrendSentiment.Good : KpiTrendSentiment.Bad,
            _ => KpiTrendSentiment.Neutral,
        };
    }

    private static string? Format(double? value, KpiQueryDto dto)
    {
        if (value is not { } v)
        {
            return null;
        }

        var number = v.ToString("N" + Math.Clamp(dto.DecimalPlaces, 0, 6), CultureInfo.InvariantCulture);
        return $"{dto.UnitPrefix}{number}{dto.UnitSuffix}";
    }
}
