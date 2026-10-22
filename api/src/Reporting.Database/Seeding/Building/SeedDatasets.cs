using Reporting.Abstractions;

namespace Reporting.Database;

internal static class SeedDatasets
{
    public static Dataset Create(string name, int sourceId, string sourceConfigJson)
    {
        return new Dataset { Name = name, DatasetSourceId = sourceId, SourceConfigJson = sourceConfigJson };
    }

    public static DatasetColumn Column(Dataset dataset, string name, DatasetColumnType type, int order, string configurationJson = "{}")
    {
        var column = new DatasetColumn
        {
            RefId = Guid.NewGuid(),
            Name = name,
            Type = type,
            Order = order,
            ConfigurationJson = configurationJson,
        };
        dataset.Columns.Add(column);
        return column;
    }

    public static void AddRow(Dataset dataset, SeedBatch batch, Dictionary<DatasetColumn, string> values)
    {
        var row = new DatasetRow { RefId = Guid.NewGuid() };
        dataset.Rows.Add(row);

        foreach (var (column, raw) in values)
        {
            batch.AddCell(row, column, raw);
        }
    }

    public static Guid ColumnRef(Dataset dataset, string columnName)
    {
        return dataset.Columns.First(c => c.Name == columnName).RefId;
    }
}
