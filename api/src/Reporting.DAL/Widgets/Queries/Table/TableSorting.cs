using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

internal static class TableSorting
{
    /// <summary>
    /// By the sort column's typed value, with the row id as tiebreak: paging needs a total order, or tied rows
    /// can repeat or vanish across pages. The sort column's cells are joined once rather than looked up per
    /// row, so a deep page stays cheap; a row with no cell sorts as null.
    /// </summary>
    public static IQueryable<DatasetRow> Apply(IQueryable<DatasetRow> query, DatasetColumn? sortColumn, SortDirection direction)
    {
        if (sortColumn is null)
        {
            return query.OrderBy(r => r.Id);
        }

        var sortId = sortColumn.Id;
        var joined = query.SelectMany(
            r => r.Cells.Where(c => c.ColumnId == sortId).DefaultIfEmpty(),
            (r, c) => new SortedRow { Row = r, Cell = c });
        return ByColumn(joined, sortColumn.Type, direction == SortDirection.Desc).ThenBy(x => x.Row.Id).Select(x => x.Row);
    }

    private static IOrderedQueryable<SortedRow> ByColumn(IQueryable<SortedRow> joined, DatasetColumnType type, bool desc)
    {
        return type switch
        {
            DatasetColumnType.Int or DatasetColumnType.Double => desc
                ? joined.OrderByDescending(x => x.Cell!.NumberValue)
                : joined.OrderBy(x => x.Cell!.NumberValue),
            DatasetColumnType.DateTime => desc
                ? joined.OrderByDescending(x => x.Cell!.DateValue)
                : joined.OrderBy(x => x.Cell!.DateValue),
            DatasetColumnType.Bool => desc
                ? joined.OrderByDescending(x => x.Cell!.BoolValue)
                : joined.OrderBy(x => x.Cell!.BoolValue),
            _ => desc
                ? joined.OrderByDescending(x => x.Cell!.StringValue)
                : joined.OrderBy(x => x.Cell!.StringValue)
        };
    }
}
