using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace Reporting.Database;

/// <summary>
/// Bulk-copies rows, reads back their identity ids, then bulk-copies the cells in chunks. Runs inside the
/// caller's transaction when there is one, and checks foreign keys so they stay trusted.
/// </summary>
internal sealed class SqlBulkSeedRowWriter : ISeedRowWriter
{
    private const int RowChunk = 100_000;
    private const int CellChunk = 250_000;

    public void Write(ReportingDbContext db, ISeedRowSource source)
    {
        var connection = (SqlConnection)db.Database.GetDbConnection();
        var transaction = (SqlTransaction?)db.Database.CurrentTransaction?.GetDbTransaction();
        var tables = new SeedTableNames(db);

        InsertRows(connection, transaction, tables, source);
        var rowIds = ReadRowIds(connection, transaction, tables, source.Dataset.Id);
        InsertCells(connection, transaction, tables, source, rowIds);
    }

    private static void InsertRows(SqlConnection connection, SqlTransaction? transaction, SeedTableNames tables, ISeedRowSource source)
    {
        var table = BulkRowTable.Create();
        for (var i = 0; i < source.RowCount; i++)
        {
            BulkRowTable.Add(table, source.Dataset.Id);
            if (table.Rows.Count == RowChunk)
            {
                Copy(connection, transaction, tables.Rows, table);
            }
        }

        Copy(connection, transaction, tables.Rows, table);
    }

    /// <summary>The rows' ids in insert order; any order would do, since the rows are interchangeable until filled.</summary>
    private static int[] ReadRowIds(SqlConnection connection, SqlTransaction? transaction, SeedTableNames tables, int datasetId)
    {
        using var command = new SqlCommand($"SELECT Id FROM {tables.Rows} WHERE DatasetId = @datasetId ORDER BY Id", connection, transaction);
        command.Parameters.AddWithValue("@datasetId", datasetId);
        command.CommandTimeout = 0;

        var ids = new List<int>();
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            ids.Add(reader.GetInt32(0));
        }

        return ids.ToArray();
    }

    private static void InsertCells(
        SqlConnection connection, SqlTransaction? transaction, SeedTableNames tables, ISeedRowSource source, int[] rowIds)
    {
        var table = BulkCellTable.Create();
        var index = 0;
        foreach (var values in source.Rows())
        {
            BulkCellTable.AddRow(table, rowIds[index], source.Columns, values);
            index++;
            if (table.Rows.Count >= CellChunk)
            {
                Copy(connection, transaction, tables.Cells, table);
            }
        }

        Copy(connection, transaction, tables.Cells, table);
    }

    private static void Copy(SqlConnection connection, SqlTransaction? transaction, string destination, DataTable table)
    {
        if (table.Rows.Count == 0)
        {
            return;
        }

        var options = SqlBulkCopyOptions.CheckConstraints | SqlBulkCopyOptions.TableLock;
        using var copy = new SqlBulkCopy(connection, options, transaction);
        copy.DestinationTableName = destination;
        copy.BulkCopyTimeout = 0;
        foreach (DataColumn column in table.Columns)
        {
            copy.ColumnMappings.Add(column.ColumnName, column.ColumnName);
        }

        copy.WriteToServer(table);
        table.Clear();
    }
}
