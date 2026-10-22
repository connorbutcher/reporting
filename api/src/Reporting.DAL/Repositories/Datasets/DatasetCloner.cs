using Microsoft.EntityFrameworkCore;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>Deep-copies a dataset within its revision. Column and row RefIds are regenerated so the copy is independent.</summary>
internal sealed class DatasetCloner(ReportingDbContext db)
{
    public async Task<Dataset?> CloneAsync(int id, string name)
    {
        var source = await db.Datasets
            .Include(d => d.Source)
            .Include(d => d.Columns)
            .Include(d => d.Rows).ThenInclude(r => r.Cells)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (source is null)
        {
            return null;
        }

        var copy = new Dataset
        {
            ReportRevisionId = source.ReportRevisionId,
            Name = name,
            DatasetSourceId = source.DatasetSourceId,
            Source = source.Source,
            SourceConfigJson = source.SourceConfigJson,
        };
        var columnByOldId = CopyColumns(source, copy);
        var rowPairs = CopyRows(source, copy);

        // Cells need the copied columns' ids.
        db.Datasets.Add(copy);
        await db.SaveChangesAsync();

        CopyCells(rowPairs, columnByOldId);
        await db.SaveChangesAsync();
        return copy;
    }

    private static Dictionary<int, DatasetColumn> CopyColumns(Dataset source, Dataset copy)
    {
        var columnByOldId = new Dictionary<int, DatasetColumn>();
        foreach (var column in source.Columns)
        {
            var columnCopy = new DatasetColumn
            {
                RefId = Guid.NewGuid(),
                Name = column.Name,
                Type = column.Type,
                Order = column.Order,
                ConfigurationJson = column.ConfigurationJson,
                FormulaExpression = column.FormulaExpression,
                FormulaError = column.FormulaError,
            };
            copy.Columns.Add(columnCopy);
            columnByOldId[column.Id] = columnCopy;
        }
        return columnByOldId;
    }

    private static List<(DatasetRow Source, DatasetRow Copy)> CopyRows(Dataset source, Dataset copy)
    {
        var rowPairs = new List<(DatasetRow Source, DatasetRow Copy)>();
        foreach (var row in source.Rows)
        {
            var rowCopy = new DatasetRow { RefId = Guid.NewGuid() };
            copy.Rows.Add(rowCopy);
            rowPairs.Add((row, rowCopy));
        }
        return rowPairs;
    }

    private void CopyCells(List<(DatasetRow Source, DatasetRow Copy)> rowPairs, Dictionary<int, DatasetColumn> columnByOldId)
    {
        foreach (var (sourceRow, rowCopy) in rowPairs)
        {
            foreach (var cell in sourceRow.Cells)
            {
                if (!columnByOldId.TryGetValue(cell.ColumnId, out var newColumn))
                {
                    continue;
                }

                db.DatasetCells.Add(new DatasetCell
                {
                    RowId = rowCopy.Id,
                    ColumnId = newColumn.Id,
                    StringValue = cell.StringValue,
                    NumberValue = cell.NumberValue,
                    BoolValue = cell.BoolValue,
                    DateValue = cell.DateValue,
                });
            }
        }
    }
}
