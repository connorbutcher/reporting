using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

internal static class TableSorting
{
    /// <summary>
    /// By the sort column's typed value, with the row id as tiebreak: paging needs a total order, or tied rows
    /// can repeat or vanish across pages.
    /// </summary>
    public static IQueryable<DatasetRow> Apply(IQueryable<DatasetRow> query, DatasetColumn? sortColumn, SortDirection direction)
    {
        if (sortColumn is null)
        {
            return query.OrderBy(r => r.Id);
        }
        return ByColumn(query, sortColumn, direction == SortDirection.Desc).ThenBy(r => r.Id);
    }

    private static IOrderedQueryable<DatasetRow> ByColumn(IQueryable<DatasetRow> query, DatasetColumn sortColumn, bool desc)
    {
        var sortId = sortColumn.Id;
        return sortColumn.Type switch
        {
            DatasetColumnType.Int or DatasetColumnType.Double => desc
                ? query.OrderByDescending(r => r.Cells.FirstOrDefault(c => c.ColumnId == sortId)!.NumberValue)
                : query.OrderBy(r => r.Cells.FirstOrDefault(c => c.ColumnId == sortId)!.NumberValue),
            DatasetColumnType.DateTime => desc
                ? query.OrderByDescending(r => r.Cells.FirstOrDefault(c => c.ColumnId == sortId)!.DateValue)
                : query.OrderBy(r => r.Cells.FirstOrDefault(c => c.ColumnId == sortId)!.DateValue),
            DatasetColumnType.Bool => desc
                ? query.OrderByDescending(r => r.Cells.FirstOrDefault(c => c.ColumnId == sortId)!.BoolValue)
                : query.OrderBy(r => r.Cells.FirstOrDefault(c => c.ColumnId == sortId)!.BoolValue),
            _ => desc
                ? query.OrderByDescending(r => r.Cells.FirstOrDefault(c => c.ColumnId == sortId)!.StringValue)
                : query.OrderBy(r => r.Cells.FirstOrDefault(c => c.ColumnId == sortId)!.StringValue)
        };
    }
}
