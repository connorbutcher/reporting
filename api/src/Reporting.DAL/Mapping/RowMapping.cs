using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL;

public static class RowMapping
{
    public static DatasetDataDto ToDataDto(this Dataset dataset)
    {
        return BuildDataDto(dataset, dataset.Rows);
    }

    /// <summary>The same shape as <see cref="ToDataDto"/> but over an already-narrowed row set.</summary>
    public static DatasetDataDto BuildDataDto(Dataset dataset, IEnumerable<DatasetRow> rows)
    {
        var columnRefById = dataset.Columns.ToDictionary(c => c.Id, c => c.RefId);
        return new()
        {
            Id = dataset.Id,
            Name = dataset.Name,
            Rows = rows.Select(r => r.ToDto(columnRefById)).ToList()
        };
    }

    /// <summary>Assumes <see cref="DatasetRow.Cells"/> is loaded. Cells are keyed by their column's RefId.</summary>
    public static DatasetRowDto ToDto(this DatasetRow row, IReadOnlyDictionary<int, Guid> columnRefById)
    {
        return new()
        {
            Id = row.RefId,
            // Cells with no text carry nothing the client can use.
            Values = row.Cells
                .Where(c => c.StringValue is not null && columnRefById.ContainsKey(c.ColumnId))
                .ToDictionary(c => columnRefById[c.ColumnId], c => c.StringValue!)
        };
    }
}
