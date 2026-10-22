using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// One headline number: an aggregate over a column, or the count/percent of rows failing a tolerance band.
/// Optionally compared with a fixed target or the previous rolling period, with a sparkline history, or
/// split into one value per group.
/// </summary>
public class KpiQueryService(ReportingDbContext db, ToleranceResolver tolerance, DatasetResolver resolver)
{
    public async Task<KpiQueryResultDto?> QueryForKpiAsync(int id, KpiQueryDto dto)
    {
        var resolved = await resolver.ResolveAsync(id);
        if (resolved is null)
        {
            return null;
        }
        var dataset = resolved.Physical;

        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);
        var filtered = await WidgetRowFilter.FilterAsync(db, resolved, columnsByRef, dto.Filter);
        var matching = filtered.Matching;

        var result = new KpiQueryResultDto();
        result.TotalRowCount = filtered.TotalRowCount;

        // Captured once so EF translates it as a constant, and every window below agrees on "now".
        var today = DateTime.UtcNow.Date;

        // Grouping replaces the single value, so none of the comparison or sparkline logic applies.
        if (dto.GroupByColumnId is { } groupRef && columnsByRef.TryGetValue(groupRef, out var groupColumn))
        {
            await ApplyGroupsAsync(result, dto, matching, columnsByRef, groupColumn);
            result.MatchedRowCount = filtered.MatchedRowCount;
            return result;
        }

        if (dto.ComparisonMode == KpiComparisonMode.PreviousPeriod
            && dto.DateColumnId is { } dateRef
            && columnsByRef.TryGetValue(dateRef, out var dateColumn))
        {
            await ApplyPreviousPeriodAsync(result, dto, matching, columnsByRef, dateColumn, today);
        }
        else
        {
            var current = await ComputeValueAsync(dto, matching, columnsByRef);
            result.Value = current.Value;
            result.ComparisonValue = dto.ComparisonMode == KpiComparisonMode.FixedTarget ? dto.TargetValue : null;
            result.MatchedRowCount = filtered.MatchedRowCount;
            result.Truncated = current.Truncated;
        }

        KpiPresentation.ApplyFormattingAndTrend(result, dto);
        result.Status = KpiPresentation.Status(result.Value, dto);

        if (dto.ShowSparkline && dto.DateColumnId is { } sparkDateRef && columnsByRef.TryGetValue(sparkDateRef, out var sparkDateColumn))
        {
            result.History = await BuildHistoryAsync(dto, matching, columnsByRef, sparkDateColumn, today);
        }

        return result;
    }

    /// <summary>Rolling windows: the last N days against the N days before that.</summary>
    private async Task ApplyPreviousPeriodAsync(
        KpiQueryResultDto result, KpiQueryDto dto, IQueryable<DatasetRow> matching,
        Dictionary<Guid, DatasetColumn> columnsByRef, DatasetColumn dateColumn, DateTime today)
    {
        var currentStart = today.AddDays(-dto.PeriodDays);
        var previousStart = today.AddDays(-2 * dto.PeriodDays);
        var currentRows = KpiRowScan.WithDateWindow(matching, dateColumn.Id, currentStart, today.AddDays(1));
        var previousRows = KpiRowScan.WithDateWindow(matching, dateColumn.Id, previousStart, currentStart);

        var current = await ComputeValueAsync(dto, currentRows, columnsByRef);
        var previous = await ComputeValueAsync(dto, previousRows, columnsByRef);

        result.Value = current.Value;
        result.ComparisonValue = previous.Value;
        result.MatchedRowCount = await currentRows.CountAsync();
        result.Truncated = current.Truncated || previous.Truncated;
    }

    private async Task ApplyGroupsAsync(
        KpiQueryResultDto result, KpiQueryDto dto, IQueryable<DatasetRow> matching,
        Dictionary<Guid, DatasetColumn> columnsByRef, DatasetColumn groupColumn)
    {
        var reduction = await ResolveReductionAsync(dto, columnsByRef);
        if (reduction is null)
        {
            result.Groups = [];
            result.Truncated = false;
            return;
        }

        var (groups, truncated) = await KpiGroups.BuildAsync(reduction, matching, groupColumn);
        result.Groups = groups;
        result.Truncated = truncated;
    }

    private async Task<List<KpiHistoryPointDto>> BuildHistoryAsync(
        KpiQueryDto dto, IQueryable<DatasetRow> matching, Dictionary<Guid, DatasetColumn> columnsByRef,
        DatasetColumn dateColumn, DateTime today)
    {
        var reduction = await ResolveReductionAsync(dto, columnsByRef);
        return reduction is null ? [] : await KpiHistory.BuildAsync(reduction, matching, dateColumn, today);
    }

    /// <summary>Null when a tolerance KPI's band can't be resolved.</summary>
    private async Task<KpiReduction?> ResolveReductionAsync(KpiQueryDto dto, Dictionary<Guid, DatasetColumn> columnsByRef)
    {
        KpiToleranceContext? toleranceCtx = null;
        if (dto.ValueSource == KpiValueSource.ToleranceOutOfLimits)
        {
            toleranceCtx = await ResolveToleranceContextAsync(dto, columnsByRef);
            if (toleranceCtx is null)
            {
                return null;
            }
        }

        DatasetColumn? valueColumn = dto.ValueSource == KpiValueSource.Aggregate
            && dto.Aggregate != Aggregate.Count
            && dto.ValueColumnId is { } colRef
                ? columnsByRef.GetValueOrDefault(colRef)
                : null;
        return new KpiReduction(dto, toleranceCtx, valueColumn);
    }

    private async Task<(double? Value, bool Truncated)> ComputeValueAsync(
        KpiQueryDto dto, IQueryable<DatasetRow> rows, Dictionary<Guid, DatasetColumn> columnsByRef)
    {
        return dto.ValueSource switch
        {
            KpiValueSource.ToleranceOutOfLimits => await ComputeToleranceAsync(dto, rows, columnsByRef),
            _ => await ComputeAggregateAsync(dto, rows, columnsByRef),
        };
    }

    private static async Task<(double? Value, bool Truncated)> ComputeAggregateAsync(
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
            .Take(KpiRowScan.MaxRows + 1)
            .Select(r => r.Cells.FirstOrDefault(c => c.ColumnId == column.Id)!.NumberValue)
            .ToListAsync();
        var truncated = ScanCapping.TrimToScanCap(scanned, KpiRowScan.MaxRows);
        return (KpiReducers.ReduceAggregate(scanned, dto.Aggregate), truncated);
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

        var (scanned, truncated) = await KpiRowScan.LoadAsync(rows, neededColumnIds);
        return (KpiReducers.ReduceTolerance(scanned, ctx, dto.ToleranceStatusMode, dto.ShowAsPercent), truncated);
    }

    private async Task<KpiToleranceContext?> ResolveToleranceContextAsync(KpiQueryDto dto, Dictionary<Guid, DatasetColumn> columnsByRef)
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
            return new KpiToleranceContext(column, matchColumn, null, resolved["kpi"]);
        }

        if (config.SourceRowId is { } sourceRowId)
        {
            var resolved = await tolerance.ResolveAsync(new[]
            {
                (Key: "kpi", config.SourceDatasetId, SourceRowId: sourceRowId,
                    config.MinColumnId, config.MaxColumnId,
                    config.ConcessionLowerColumnId, config.ConcessionUpperColumnId),
            });
            return new KpiToleranceContext(column, null, resolved["kpi"], null);
        }

        return null;
    }
}
