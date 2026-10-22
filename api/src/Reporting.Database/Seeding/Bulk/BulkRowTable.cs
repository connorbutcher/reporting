using System.Data;

namespace Reporting.Database;

/// <summary>A chunk of <see cref="DatasetRow"/>s shaped for SqlBulkCopy; the database assigns the ids.</summary>
internal static class BulkRowTable
{
    public static DataTable Create()
    {
        var table = new DataTable();
        table.Columns.Add(nameof(DatasetRow.RefId), typeof(Guid));
        table.Columns.Add(nameof(DatasetRow.DatasetId), typeof(int));
        return table;
    }

    public static void Add(DataTable table, int datasetId)
    {
        table.Rows.Add(Guid.NewGuid(), datasetId);
    }
}
