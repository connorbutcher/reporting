using System.Globalization;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Reduces a pivot in SQL when every measure is one SQL can compute (sum, count, average, min, max):
/// rows are grouped by the raw values of the field columns, so only one row per distinct combination
/// comes back however many rows the dataset holds. Median and distinct count need every value, so a
/// pivot using them is scanned row by row instead.
/// </summary>
public static class PivotSqlGrouping
{
    /// <summary>The field columns ride in slots 0…, the measure column in the last slot.</summary>
    private const int MeasureSlot = CellPivot.MaxColumns - 1;

    public static bool CanReduce(IReadOnlyList<PivotMeasurePlan> measures, int fieldColumnCount) =>
        fieldColumnCount <= MeasureSlot
        && measures.All(m => m.Aggregate is not (PivotAggregate.Median or PivotAggregate.CountDistinct));

    /// <summary>
    /// The pivot's groups: each one's field cells (keyed by column id, absent when blank), its row
    /// count, and per measure column its count/sum/min/max. One GROUP BY per distinct measure column,
    /// merged on the group's field values.
    /// </summary>
    public static async Task<List<(Dictionary<int, DatasetCell> Cells, int Rows, Dictionary<int, BarStats> Stats)>> ReduceAsync(
        IQueryable<DatasetRow> rows, IReadOnlyList<int> fieldColumnIds, IReadOnlyList<int> measureColumnIds)
    {
        // A count-only pivot still needs one query for its row tallies; id 0 matches no cell.
        var queried = measureColumnIds.Count > 0 ? measureColumnIds : [0];
        var merged = new Dictionary<string, (Dictionary<int, DatasetCell> Cells, int Rows, Dictionary<int, BarStats> Stats)>();
        foreach (var measureColumnId in queried)
        {
            foreach (var group in await GroupAsync(rows, fieldColumnIds, measureColumnId))
            {
                var key = KeyText(group.Key, fieldColumnIds.Count);
                if (!merged.TryGetValue(key, out var entry))
                {
                    entry = (Cells(group.Key, fieldColumnIds), group.Rows, new Dictionary<int, BarStats>());
                    merged[key] = entry;
                }
                if (measureColumnId != 0)
                {
                    entry.Stats[measureColumnId] = new BarStats(group.Count, group.Sum, group.Min, group.Max);
                }
            }
        }
        return merged.Values.ToList();
    }

    private static Task<List<PivotSqlGroup>> GroupAsync(
        IQueryable<DatasetRow> rows, IReadOnlyList<int> fieldColumnIds, int measureColumnId)
    {
        var ids = new int[CellPivot.MaxColumns];
        for (var i = 0; i < fieldColumnIds.Count; i++)
        {
            ids[i] = fieldColumnIds[i];
        }
        ids[MeasureSlot] = measureColumnId;

        return CellPivot.Of(rows, ids)
            .GroupBy(KeySelector(fieldColumnIds.Count))
            .Select(g => new PivotSqlGroup
            {
                Key = g.Key,
                Rows = g.Count(),
                Count = g.Count(p => p.N7 != null),
                Sum = g.Sum(p => p.N7),
                Min = g.Min(p => p.N7),
                Max = g.Max(p => p.N7)
            })
            .ToListAsync();
    }

    /// <summary>
    /// <c>p => new PivotedRow { T0 = p.T0, N0 = p.N0, D0 = p.D0, … }</c> over the field slots only,
    /// so the measure slot (and unused slots) stay out of the GROUP BY. With no fields every row
    /// falls in one group, keyed by a constant.
    /// </summary>
    private static Expression<Func<PivotedRow, PivotedRow>> KeySelector(int fieldCount)
    {
        var row = Expression.Parameter(typeof(PivotedRow), "p");
        var bindings = new List<MemberBinding>();
        for (var i = 0; i < fieldCount; i++)
        {
            foreach (var prefix in new[] { "T", "N", "D" })
            {
                var property = typeof(PivotedRow).GetProperty(prefix + i)!;
                bindings.Add(Expression.Bind(property, Expression.Property(row, property)));
            }
        }
        if (fieldCount == 0)
        {
            bindings.Add(Expression.Bind(typeof(PivotedRow).GetProperty(nameof(PivotedRow.RowId))!, Expression.Constant(0)));
        }
        return Expression.Lambda<Func<PivotedRow, PivotedRow>>(
            Expression.MemberInit(Expression.New(typeof(PivotedRow)), bindings), row);
    }

    /// <summary>A group's field values as one string, to merge the same group across measure queries.</summary>
    private static string KeyText(PivotedRow key, int fieldCount)
    {
        var parts = new List<string>();
        for (var i = 0; i < fieldCount; i++)
        {
            var (text, number, date) = Slot(key, i);
            parts.Add(text ?? "\u0002");
            parts.Add(number?.ToString("R", CultureInfo.InvariantCulture) ?? "\u0002");
            parts.Add(date?.ToString("o", CultureInfo.InvariantCulture) ?? "\u0002");
        }
        return string.Join('\u0001', parts);
    }

    private static Dictionary<int, DatasetCell> Cells(PivotedRow key, IReadOnlyList<int> fieldColumnIds)
    {
        var cells = new Dictionary<int, DatasetCell>();
        for (var i = 0; i < fieldColumnIds.Count; i++)
        {
            var (text, number, date) = Slot(key, i);
            if (CellPivot.Cell(fieldColumnIds[i], text, number, date) is { } cell)
            {
                cells[fieldColumnIds[i]] = cell;
            }
        }
        return cells;
    }

    private static (string? Text, double? Number, DateTime? Date) Slot(PivotedRow row, int slot) => slot switch
    {
        0 => (row.T0, row.N0, row.D0),
        1 => (row.T1, row.N1, row.D1),
        2 => (row.T2, row.N2, row.D2),
        3 => (row.T3, row.N3, row.D3),
        4 => (row.T4, row.N4, row.D4),
        5 => (row.T5, row.N5, row.D5),
        6 => (row.T6, row.N6, row.D6),
        _ => (row.T7, row.N7, row.D7)
    };
}
