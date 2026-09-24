using Reporting.Abstractions;
using Reporting.DAL.Formulas;
using Reporting.DAL.Formulas.Catalogue;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.Tests.Formulas;

/// <summary>
/// A dataset of Qty (int), Price (double), Region (text) and Ordered (date) with three rows — the last with a
/// blank Qty — to add formula columns to, and the helpers to read back what they computed.
/// </summary>
public abstract class FormulaColumnTestBase : SqliteDbTestBase
{
    protected FormulaColumnTestBase() : base(foreignKeys: false)
    {
    }

    protected int DatasetId { get; private set; }

    /// <summary>Fresh services on a cleared change tracker — each call stands in for a new request.</summary>
    protected FormulaColumnServices Fresh()
    {
        Db.ChangeTracker.Clear();
        var calculator = new FormulaCalculationService(Db, new FormulaFunctionCatalogueLoader(Db));

        return new FormulaColumnServices(
            new DatasetFormulaRepository(Db, calculator),
            new DatasetRepository(Db, calculator),
            new DatasetRowRepository(Db, calculator));
    }

    protected async Task SeedAsync()
    {
        var dataset = new Dataset
        {
            Name = "Sales",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns =
            {
                new DatasetColumn { RefId = Guid.NewGuid(), Name = "Qty", Type = DatasetColumnType.Int, Order = 0 },
                new DatasetColumn { RefId = Guid.NewGuid(), Name = "Price", Type = DatasetColumnType.Double, Order = 1 },
                new DatasetColumn { RefId = Guid.NewGuid(), Name = "Region", Type = DatasetColumnType.String, Order = 2 },
                new DatasetColumn { RefId = Guid.NewGuid(), Name = "Ordered", Type = DatasetColumnType.DateTime, Order = 3 },
            },
        };
        Db.Datasets.Add(dataset);
        await Db.SaveChangesAsync();
        DatasetId = dataset.Id;

        await AddRowAsync("2", "10.5", "North", "2026-03-01");
        await AddRowAsync("3", "4", "South", "2026-03-15");
        await AddRowAsync(null, "7", null, null);
    }

    protected async Task<DatasetRowDto> AddRowAsync(string? qty, string? price, string? region, string? ordered)
    {
        var schema = await SchemaAsync();
        var values = new Dictionary<Guid, string>();
        PutValue(values, schema, "Qty", qty);
        PutValue(values, schema, "Price", price);
        PutValue(values, schema, "Region", region);
        PutValue(values, schema, "Ordered", ordered);

        return (await Fresh().Rows.AddRowAsync(DatasetId, values))!;
    }

    protected Task<DatasetColumnDto?> AddFormulaAsync(string name, string expression, DatasetColumnType? type = null)
    {
        var dto = new SaveFormulaColumnDto { Name = name, Expression = expression, Type = type };
        return Fresh().Formulas.AddAsync(DatasetId, dto);
    }

    protected Task<DatasetColumnDto?> UpdateFormulaAsync(Guid columnId, string name, string expression)
    {
        var dto = new SaveFormulaColumnDto { Name = name, Expression = expression };
        return Fresh().Formulas.UpdateAsync(DatasetId, columnId, dto);
    }

    protected async Task<DatasetSchemaDto> SchemaAsync()
    {
        return (await Fresh().Datasets.GetSchemaAsync(DatasetId))!;
    }

    protected async Task<DatasetColumnDto> ColumnDtoAsync(string name)
    {
        return (await SchemaAsync()).Columns.Single(c => c.Name == name);
    }

    protected async Task<Guid> ColumnAsync(string name)
    {
        return (await ColumnDtoAsync(name)).Id;
    }

    /// <summary>Every row's values keyed by column name, in insertion order.</summary>
    protected async Task<List<Dictionary<string, string?>>> RowsAsync()
    {
        var schema = await SchemaAsync();
        var window = (await Fresh().Rows.GetRowWindowAsync(DatasetId, 0, 500))!;

        var rows = new List<Dictionary<string, string?>>();
        foreach (var row in window.Rows)
        {
            var byName = new Dictionary<string, string?>();
            foreach (var column in schema.Columns)
            {
                byName[column.Name] = row.Values.GetValueOrDefault(column.Id);
            }

            rows.Add(byName);
        }

        return rows;
    }

    protected async Task<List<string?>> ColumnValuesAsync(string name)
    {
        var rows = await RowsAsync();
        return rows.Select(r => r[name]).ToList();
    }

    private static void PutValue(Dictionary<Guid, string> values, DatasetSchemaDto schema, string columnName, string? value)
    {
        if (value is null)
        {
            return;
        }

        values[schema.Columns.Single(c => c.Name == columnName).Id] = value;
    }
}
