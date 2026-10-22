using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Rows grouped by the row fields (nested left to right), optionally spread across the column fields, with
/// each cell reduced per measure. Cells are EAV, so the needed ones are pulled back (capped) and grouped in
/// memory into a <see cref="PivotNode"/> tree that yields detail rows, subtotals and totals in one pass.
/// </summary>
public class PivotQueryService(ReportingDbContext db, DatasetResolver resolver)
{
    /// <summary>Every row must be pulled to be grouped in memory, so a runaway dataset is capped and flagged.</summary>
    public const int MaxPivotScanRows = 200_000;

    /// <summary>Stops a high-cardinality dimension fanning out; totals still reduce every scanned row.</summary>
    public const int MaxPivotRows = 2_000;

    public const int MaxPivotColumns = 100;

    public async Task<PivotQueryResultDto?> QueryForPivotAsync(int id, PivotQueryDto dto)
    {
        var resolved = await resolver.ResolveAsync(id);
        if (resolved is null)
        {
            return null;
        }
        var dataset = resolved.Physical;

        var result = new PivotQueryResultDto { Id = resolved.Id, Name = resolved.Name };
        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);

        var operatorCatalogue = await FilterOperators.LoadCatalogueAsync(db);
        var baseRows = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var all = FilterTranslator.Apply(baseRows, resolved.MandatoryFilter, columnsByRef, operatorCatalogue: operatorCatalogue);
        var predicate = FilterTranslator.Build(dto.Filter, columnsByRef, operatorCatalogue: operatorCatalogue);
        var matching = predicate is null ? all : all.Where(predicate);

        result.TotalRowCount = await all.CountAsync();
        result.MatchedRowCount = predicate is null ? result.TotalRowCount : await matching.CountAsync();

        var plan = PivotPlan.Resolve(dto, columnsByRef);
        if (plan.Measures.Count == 0)
        {
            return result;
        }

        result.RowFields = plan.RowFields.Select(PivotHeaders.Field).ToList();
        result.ColumnFields = plan.ColumnFields.Select(PivotHeaders.Field).ToList();
        result.Measures = plan.Measures.Select(PivotHeaders.Measure).ToList();

        var tree = await BuildTreeAsync(matching, plan, result);
        var shownKeys = ApplyColumnKeys(result, tree, plan.ColumnFields);
        result.HasRowTotals = plan.ColumnFields.Count > 0 && dto.ShowGrandTotal;

        var layout = new PivotLayout(tree.Root, plan.Measures, plan.ColumnFields.Count > 0, shownKeys, result.HasRowTotals, plan.RowFields);
        var ordered = PivotRowOrder.Order(tree.Root, plan.RowFields, plan.Measures, dto, out var leafCount);
        result.RowsTruncated = leafCount > MaxPivotRows;
        result.Rows = ordered.Select(layout.Row).ToList();

        if (dto.ShowGrandTotal && plan.RowFields.Count > 0)
        {
            result.GrandTotal = GrandTotal(layout, tree.Root, plan.RowFields.Count);
        }

        result.Truncated = result.ScanTruncated || result.RowsTruncated || result.ColumnsTruncated;
        return result;
    }

    /// <summary>Pulls only the cells the pivot reads, capped.</summary>
    private static async Task<PivotTree> BuildTreeAsync(IQueryable<DatasetRow> matching, PivotPlan plan, PivotQueryResultDto result)
    {
        var neededIds = plan.NeededColumnIds();
        var rows = await matching
            .OrderBy(r => r.Id)
            .Take(MaxPivotScanRows)
            .Include(r => r.Cells.Where(c => neededIds.Contains(c.ColumnId)))
            .AsNoTracking()
            .ToListAsync();
        result.ScannedRowCount = rows.Count;
        result.ScanTruncated = result.MatchedRowCount > MaxPivotScanRows;

        var tree = new PivotTree(plan.RowFields, plan.ColumnFields, plan.Measures);
        foreach (var row in rows)
        {
            tree.Add(row);
        }
        return tree;
    }

    /// <summary>The column keys across the top in their fields' natural order, capped. Returns the shown keys.</summary>
    private static List<string> ApplyColumnKeys(PivotQueryResultDto result, PivotTree tree, List<PivotField> columnFields)
    {
        var columnTypes = columnFields.Select(f => f.Column.Type).ToList();
        var orderedKeys = tree.ColumnKeys.Values
            .OrderBy(k => k.SortKeys, Comparer<object?[]>.Create((a, b) => PivotKeyComparison.Compare(a, b, columnTypes)))
            .ToList();
        result.ColumnsTruncated = orderedKeys.Count > MaxPivotColumns;

        var shownKeys = orderedKeys.Take(MaxPivotColumns).ToList();
        result.ColumnKeys = shownKeys
            .Select(k => new PivotColumnKeyDto { Labels = k.Displays.ToList(), Drill = PivotDrill.ForColumn(k, columnFields) })
            .ToList();
        return shownKeys.Select(k => k.Key).ToList();
    }

    private static PivotRowDto GrandTotal(PivotLayout layout, PivotNode root, int rowFieldCount)
    {
        var total = layout.Row(root);
        total.Dimensions = Enumerable.Range(0, rowFieldCount).Select(i => i == 0 ? "Total" : string.Empty).ToList();
        total.IsGrandTotal = true;
        return total;
    }
}
