using System.Data;

namespace Reporting.Database;

/// <summary>A chunk of <see cref="DatasetCell"/>s shaped for SqlBulkCopy, typed by <see cref="CellValues"/> like any other cell.</summary>
internal static class BulkCellTable
{
    public static DataTable Create()
    {
        var table = new DataTable();
        table.Columns.Add(nameof(DatasetCell.RowId), typeof(int));
        table.Columns.Add(nameof(DatasetCell.ColumnId), typeof(int));
        table.Columns.Add(nameof(DatasetCell.StringValue), typeof(string));
        table.Columns.Add(nameof(DatasetCell.NumberValue), typeof(double));
        table.Columns.Add(nameof(DatasetCell.BoolValue), typeof(bool));
        table.Columns.Add(nameof(DatasetCell.DateValue), typeof(DateTime));
        return table;
    }

    public static void AddRow(DataTable table, int rowId, IReadOnlyList<DatasetColumn> columns, string?[] values)
    {
        for (var i = 0; i < values.Length; i++)
        {
            if (values[i] is { } raw)
            {
                var cell = CellValues.Create(columns[i].Id, raw, columns[i].Type);
                table.Rows.Add(rowId, cell.ColumnId, cell.StringValue, Value(cell.NumberValue), Value(cell.BoolValue), Value(cell.DateValue));
            }
        }
    }

    private static object Value<T>(T? value) where T : struct
    {
        return value is { } v ? v : DBNull.Value;
    }
}
