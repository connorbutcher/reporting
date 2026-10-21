using System.Runtime.CompilerServices;
using Microsoft.EntityFrameworkCore;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Streams rows as just the cells a widget reads, keyed by column id, in row order. The cells come
/// back as plain values in one query and are grouped per row as they arrive, so no tracked entities
/// pile up in memory, and a row with none of the cells still comes through (with no cells).
/// </summary>
public static class RowCellStream
{
    public static async IAsyncEnumerable<Dictionary<int, DatasetCell>> ReadAsync(
        IQueryable<DatasetRow> rows,
        ICollection<int> columnIds,
        int take,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var cells = rows
            .OrderBy(r => r.Id)
            .Take(take)
            .SelectMany(
                r => r.Cells.Where(c => columnIds.Contains(c.ColumnId)).DefaultIfEmpty(),
                (r, c) => new
                {
                    RowId = r.Id,
                    ColumnId = (int?)c!.ColumnId,
                    c.StringValue,
                    c.NumberValue,
                    c.DateValue,
                    c.BoolValue
                })
            .OrderBy(x => x.RowId)
            .AsAsyncEnumerable()
            .WithCancellation(cancellationToken);

        int? currentRowId = null;
        var current = new Dictionary<int, DatasetCell>();
        await foreach (var cell in cells)
        {
            if (currentRowId != cell.RowId)
            {
                if (currentRowId is not null)
                {
                    yield return current;
                    current = new Dictionary<int, DatasetCell>();
                }
                currentRowId = cell.RowId;
            }
            if (cell.ColumnId is { } columnId)
            {
                current[columnId] = new DatasetCell
                {
                    RowId = cell.RowId,
                    ColumnId = columnId,
                    StringValue = cell.StringValue,
                    NumberValue = cell.NumberValue,
                    DateValue = cell.DateValue,
                    BoolValue = cell.BoolValue
                };
            }
        }
        if (currentRowId is not null)
        {
            yield return current;
        }
    }
}
