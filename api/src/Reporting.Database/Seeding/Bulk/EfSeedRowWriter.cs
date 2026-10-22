namespace Reporting.Database;

/// <summary>Adds rows through EF a batch at a time, clearing the change tracker between batches.</summary>
internal sealed class EfSeedRowWriter : ISeedRowWriter
{
    private const int BatchSize = 2_000;

    public void Write(ReportingDbContext db, ISeedRowSource source)
    {
        var pending = new List<DatasetRow>(BatchSize);
        foreach (var values in source.Rows())
        {
            pending.Add(ToRow(source, values));
            if (pending.Count == BatchSize)
            {
                Save(db, pending);
            }
        }

        Save(db, pending);
    }

    private static DatasetRow ToRow(ISeedRowSource source, string?[] values)
    {
        var row = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = source.Dataset.Id };
        for (var i = 0; i < values.Length; i++)
        {
            if (values[i] is { } raw)
            {
                var column = source.Columns[i];
                row.Cells.Add(CellValues.Create(column.Id, raw, column.Type));
            }
        }

        return row;
    }

    private static void Save(ReportingDbContext db, List<DatasetRow> rows)
    {
        if (rows.Count == 0)
        {
            return;
        }

        db.DatasetRows.AddRange(rows);
        db.SaveChanges();
        db.ChangeTracker.Clear();
        rows.Clear();
    }
}
