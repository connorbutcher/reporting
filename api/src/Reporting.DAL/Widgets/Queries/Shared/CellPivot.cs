using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Turns the cells a widget reads into columns of one row each, in a single pass over the cells.
/// Reading a cell with <c>r.Cells.Where(c => c.ColumnId == id).Select(...).FirstOrDefault()</c> makes
/// the database run one correlated lookup per row per column, which is what made charts and sorted
/// tables crawl on large datasets. Here the needed cells are joined to their rows once and folded into
/// columns by conditional aggregation (<c>MAX(CASE WHEN ColumnId = @id THEN ... END)</c>), so the cost
/// is one scan of those columns' cells however many rows there are.
/// </summary>
public static class CellPivot
{
    /// <summary>The most columns one pivot carries; see <see cref="PivotedRow"/>.</summary>
    public const int MaxColumns = 8;

    /// <summary>
    /// Every row of <paramref name="rows"/> (rows with none of the cells included, every slot null)
    /// with the cells of <paramref name="columnIds"/> in slots 0, 1, … in that order. An id that no
    /// cell carries — the 0 callers pass for an unbound series column, say — leaves its slot null.
    /// Compose further Where/GroupBy/Select on the result: only the slots read end up in the SQL, so
    /// unused slots cost nothing.
    /// </summary>
    public static IQueryable<PivotedRow> Of(IQueryable<DatasetRow> rows, params int[] columnIds)
    {
        if (columnIds.Length is 0 or > MaxColumns)
        {
            throw new ArgumentOutOfRangeException(nameof(columnIds), $"A pivot carries 1 to {MaxColumns} columns.");
        }

        var ids = columnIds.Concat(Enumerable.Repeat(0, MaxColumns - columnIds.Length)).ToArray();
        var (c0, c1, c2, c3, c4, c5, c6, c7) = (ids[0], ids[1], ids[2], ids[3], ids[4], ids[5], ids[6], ids[7]);
        var wanted = columnIds.Distinct().ToList();

        return rows
            .SelectMany(
                r => r.Cells.Where(c => wanted.Contains(c.ColumnId)).DefaultIfEmpty(),
                (r, c) => new { r.Id, Cell = c })
            .GroupBy(x => x.Id, x => x.Cell)
            .Select(g => new PivotedRow
            {
                RowId = g.Key,
                T0 = g.Max(c => c!.ColumnId == c0 ? c.StringValue : null),
                N0 = g.Max(c => c!.ColumnId == c0 ? c.NumberValue : null),
                D0 = g.Max(c => c!.ColumnId == c0 ? c.DateValue : null),
                T1 = g.Max(c => c!.ColumnId == c1 ? c.StringValue : null),
                N1 = g.Max(c => c!.ColumnId == c1 ? c.NumberValue : null),
                D1 = g.Max(c => c!.ColumnId == c1 ? c.DateValue : null),
                T2 = g.Max(c => c!.ColumnId == c2 ? c.StringValue : null),
                N2 = g.Max(c => c!.ColumnId == c2 ? c.NumberValue : null),
                D2 = g.Max(c => c!.ColumnId == c2 ? c.DateValue : null),
                T3 = g.Max(c => c!.ColumnId == c3 ? c.StringValue : null),
                N3 = g.Max(c => c!.ColumnId == c3 ? c.NumberValue : null),
                D3 = g.Max(c => c!.ColumnId == c3 ? c.DateValue : null),
                T4 = g.Max(c => c!.ColumnId == c4 ? c.StringValue : null),
                N4 = g.Max(c => c!.ColumnId == c4 ? c.NumberValue : null),
                D4 = g.Max(c => c!.ColumnId == c4 ? c.DateValue : null),
                T5 = g.Max(c => c!.ColumnId == c5 ? c.StringValue : null),
                N5 = g.Max(c => c!.ColumnId == c5 ? c.NumberValue : null),
                D5 = g.Max(c => c!.ColumnId == c5 ? c.DateValue : null),
                T6 = g.Max(c => c!.ColumnId == c6 ? c.StringValue : null),
                N6 = g.Max(c => c!.ColumnId == c6 ? c.NumberValue : null),
                D6 = g.Max(c => c!.ColumnId == c6 ? c.DateValue : null),
                T7 = g.Max(c => c!.ColumnId == c7 ? c.StringValue : null),
                N7 = g.Max(c => c!.ColumnId == c7 ? c.NumberValue : null),
                D7 = g.Max(c => c!.ColumnId == c7 ? c.DateValue : null)
            });
    }

    /// <summary>
    /// A slot's values as the cell they came from, for code that reads cells (formatting, tolerance
    /// matching); null when the row had no cell there. Not tracked, never saved.
    /// </summary>
    public static DatasetCell? Cell(int columnId, string? text, double? number, DateTime? date)
    {
        return text is null && number is null && date is null
            ? null
            : new DatasetCell
            {
                ColumnId = columnId,
                StringValue = text,
                NumberValue = number,
                DateValue = date,
                BoolValue = CellValues.TryParseBool(text, out var flag) ? flag : null
            };
    }
}
