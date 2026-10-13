using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// One headline number reduced from a dataset: either a plain aggregate over a column, or the
/// count/percent of rows failing a tolerance band (reusing <see cref="ToleranceResolver"/>, the same
/// classification the table widget bands its cells with). Optionally compared against a fixed target
/// or the previous rolling period — in which case both figures are computed over their own date
/// window rather than over the whole filtered set, so the comparison is apples-to-apples.
/// </summary>
public class KpiQueryService(ReportingDbContext db, ToleranceResolver tolerance)
{
    /// <summary>Ceiling on rows scanned to reduce one KPI value — every row must be pulled into memory
    /// to aggregate or tolerance-classify it, same reasoning as <c>PivotQueryService</c>.</summary>
    private const int MaxKpiScanRows = 200_000;

    public async Task<KpiQueryResultDto?> QueryForKpiAsync(int id, KpiQueryDto dto)
    {
        var dataset = await db.Datasets.AsNoTracking().Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null)
        {
            return null;
        }

        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);
        var operatorCatalogue = await FilterOperators.LoadCatalogueAsync(db);
        var all = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var matching = FilterTranslator.Apply(all, dto.Filter, columnsByRef, operatorCatalogue: operatorCatalogue);

        var result = new KpiQueryResultDto();
        var (totalRowCount, filteredRowCount) = await RowCounts.CountRowsAsync(all, matching);
        result.TotalRowCount = totalRowCount;

        if (dto.ComparisonMode == KpiComparisonMode.PreviousPeriod
            && dto.DateColumnId is { } dateRef
            && columnsByRef.TryGetValue(dateRef, out var dateColumn))
        {
            // Rolling windows, not calendar-aligned weeks/months: "last N days" vs the N days before
            // that. `today` is captured once into a local so EF treats it as a constant it can
            // translate to SQL, rather than re-evaluating a clock call per row (same quirk
            // DateConditionTranslator works around for the relative date filter operators).
            var today = DateTime.UtcNow.Date;
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

        var present = scanned.Where(v => v.HasValue).Select(v => v!.Value).ToList();
        if (present.Count == 0)
        {
            return (null, truncated);
        }

        double value = dto.Aggregate switch
        {
            Aggregate.Sum => present.Sum(),
            Aggregate.Average => present.Average(),
            Aggregate.Min => present.Min(),
            Aggregate.Max => present.Max(),
            _ => present.Sum(),
        };
        return (value, truncated);
    }

    private async Task<(double? Value, bool Truncated)> ComputeToleranceAsync(
        KpiQueryDto dto, IQueryable<DatasetRow> rows, Dictionary<Guid, DatasetColumn> columnsByRef)
    {
        if (dto.Tolerance is not { } config
            || dto.ValueColumnId is not { } colRef
            || !columnsByRef.TryGetValue(colRef, out var column))
        {
            return (null, false);
        }

        ToleranceBounds? fixedBounds = null;
        MatchedLimits? matchedLimits = null;
        DatasetColumn? matchColumn = null;

        if (config.Match is { } match)
        {
            var resolved = await tolerance.ResolveMatchedAsync(new[]
            {
                (Key: "kpi", config.SourceDatasetId, MatchColumnId: match.SourceColumnId,
                    config.MinColumnId, config.MaxColumnId,
                    config.ConcessionLowerColumnId, config.ConcessionUpperColumnId),
            });
            matchedLimits = resolved["kpi"];
            columnsByRef.TryGetValue(match.ColumnId, out matchColumn);
        }
        else if (config.SourceRowId is { } sourceRowId)
        {
            var resolved = await tolerance.ResolveAsync(new[]
            {
                (Key: "kpi", config.SourceDatasetId, SourceRowId: sourceRowId,
                    config.MinColumnId, config.MaxColumnId,
                    config.ConcessionLowerColumnId, config.ConcessionUpperColumnId),
            });
            fixedBounds = resolved["kpi"];
        }
        else
        {
            return (null, false);
        }

        var neededColumnIds = new HashSet<int> { column.Id };
        if (matchColumn is not null)
        {
            neededColumnIds.Add(matchColumn.Id);
        }

        var scanned = await rows
            .OrderBy(r => r.Id)
            .Take(MaxKpiScanRows + 1)
            .Include(r => r.Cells.Where(c => neededColumnIds.Contains(c.ColumnId)))
            .AsNoTracking()
            .ToListAsync();
        var truncated = ScanCapping.TrimToScanCap(scanned, MaxKpiScanRows);

        var total = 0;
        var failing = 0;
        foreach (var row in scanned)
        {
            if (row.Cells.FirstOrDefault(c => c.ColumnId == column.Id)?.NumberValue is not { } value)
            {
                continue;
            }

            var bounds = matchColumn is not null
                ? matchedLimits!.For(row.Cells.FirstOrDefault(c => c.ColumnId == matchColumn.Id))
                : fixedBounds;

            total++;
            var status = ToleranceResolver.Classify(value, bounds);
            if (status == ToleranceStatus.Fail
                || (dto.ToleranceStatusMode == KpiToleranceStatusMode.FailOrConcession && status == ToleranceStatus.Concession))
            {
                failing++;
            }
        }

        if (total == 0)
        {
            return (null, truncated);
        }

        double value2 = dto.ShowAsPercent ? 100.0 * failing / total : failing;
        return (value2, truncated);
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
        return string.IsNullOrEmpty(dto.Unit) ? number : $"{number}{dto.Unit}";
    }
}
