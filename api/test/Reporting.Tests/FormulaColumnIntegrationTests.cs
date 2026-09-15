using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Formulas;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// Exercises formula columns end-to-end through <see cref="DatasetFormulaRepository"/>,
/// <see cref="DatasetRepository"/> and <see cref="DatasetRowRepository"/> against a real (SQLite)
/// relational provider: creating a formula computes existing rows, editing one recomputes, writing a
/// row keeps its formula cells current, a rename keeps a dependent formula pointed at the right
/// column, and a dependency blocks deletion and rejects a cycle.
/// </summary>
public class FormulaColumnIntegrationTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly ReportingDbContext _db;

    public FormulaColumnIntegrationTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        using (var pragma = _connection.CreateCommand())
        {
            pragma.CommandText = "PRAGMA foreign_keys = OFF";
            pragma.ExecuteNonQuery();
        }

        var options = new DbContextOptionsBuilder<ReportingDbContext>().UseSqlite(_connection).Options;
        _db = new ReportingDbContext(options);
        _db.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    private DatasetRepository Datasets() => new(_db, Formulas());
    private DatasetFormulaRepository Formulas() => new(_db);
    private DatasetRowRepository Rows() => new(_db);

    /// <summary>A dataset with Measured/Nominal Double columns and the given (measured, nominal) rows.</summary>
    private async Task<int> SeedAsync(params (double Measured, double Nominal)[] rows)
    {
        var dataset = new Dataset
        {
            Name = "D",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns =
            {
                new DatasetColumn { RefId = Guid.NewGuid(), Name = "Measured", Type = DatasetColumnType.Double, Order = 0 },
                new DatasetColumn { RefId = Guid.NewGuid(), Name = "Nominal", Type = DatasetColumnType.Double, Order = 1 },
            },
        };
        _db.Datasets.Add(dataset);
        await _db.SaveChangesAsync();

        var measuredId = dataset.Columns[0].Id;
        var nominalId = dataset.Columns[1].Id;
        foreach (var (measured, nominal) in rows)
        {
            var row = new DatasetRow { DatasetId = dataset.Id, RefId = Guid.NewGuid() };
            row.Cells.Add(new DatasetCell { ColumnId = measuredId, StringValue = measured.ToString(), NumberValue = measured });
            row.Cells.Add(new DatasetCell { ColumnId = nominalId, StringValue = nominal.ToString(), NumberValue = nominal });
            _db.DatasetRows.Add(row);
        }
        await _db.SaveChangesAsync();

        return dataset.Id;
    }

    private async Task<List<double?>> DeviationValuesAsync(int datasetId)
    {
        var rows = await _db.DatasetRows.Where(r => r.DatasetId == datasetId).Include(r => r.Cells).OrderBy(r => r.Id).ToListAsync();
        var deviationColumnId = await _db.DatasetColumns.Where(c => c.DatasetId == datasetId && c.Name == "Deviation").Select(c => c.Id).FirstAsync();
        return rows.Select(r => r.Cells.FirstOrDefault(c => c.ColumnId == deviationColumnId)?.NumberValue).ToList();
    }

    [Fact]
    public async Task Adding_a_formula_column_computes_every_existing_row()
    {
        var datasetId = await SeedAsync((12.5, 12.0), (10.0, 10.0));

        var column = await Formulas().AddFormulaColumnAsync(datasetId, "Deviation", DatasetColumnType.Double, "[Measured] - [Nominal]");

        Assert.NotNull(column);
        Assert.True(column!.IsComputed);
        Assert.Equal([0.5, 0.0], await DeviationValuesAsync(datasetId));
    }

    [Fact]
    public async Task A_bad_formula_is_rejected_and_nothing_is_created()
    {
        var datasetId = await SeedAsync((1, 1));

        await Assert.ThrowsAsync<FormulaValidationException>(() =>
            Formulas().AddFormulaColumnAsync(datasetId, "Deviation", DatasetColumnType.Double, "[NopeColumn] + 1"));

        var schema = await Datasets().GetSchemaAsync(datasetId);
        Assert.DoesNotContain(schema!.Columns, c => c.Name == "Deviation");
    }

    [Fact]
    public async Task Editing_a_formula_recomputes_every_row()
    {
        var datasetId = await SeedAsync((12.5, 12.0), (10.0, 10.0));
        var column = await Formulas().AddFormulaColumnAsync(datasetId, "Deviation", DatasetColumnType.Double, "[Measured] - [Nominal]");

        await Formulas().UpdateFormulaAsync(datasetId, column!.Id, "Deviation", DatasetColumnType.Double, "ABS([Measured] - [Nominal]) * 2");

        Assert.Equal([1.0, 0.0], await DeviationValuesAsync(datasetId));
    }

    [Fact]
    public async Task Writing_a_row_keeps_its_formula_cell_current()
    {
        var datasetId = await SeedAsync((1, 1)); // seeded row: Deviation = 1 - 1 = 0
        await Formulas().AddFormulaColumnAsync(datasetId, "Deviation", DatasetColumnType.Double, "[Measured] - [Nominal]");
        var schema = await Datasets().GetSchemaAsync(datasetId); // refresh to pick up the new column's RefId

        var measuredRef = schema!.Columns.First(c => c.Name == "Measured").Id;
        var nominalRef = schema.Columns.First(c => c.Name == "Nominal").Id;

        await Rows().AddRowAsync(datasetId, new Dictionary<Guid, string>
        {
            [measuredRef] = "20",
            [nominalRef] = "18",
        });

        Assert.Equal([0.0, 2.0], await DeviationValuesAsync(datasetId));
    }

    [Fact]
    public async Task A_client_supplied_value_for_a_formula_column_is_ignored()
    {
        var datasetId = await SeedAsync((5, 5));
        var column = await Formulas().AddFormulaColumnAsync(datasetId, "Deviation", DatasetColumnType.Double, "[Measured] - [Nominal]");
        var schema = await Datasets().GetSchemaAsync(datasetId);
        var measuredRef = schema!.Columns.First(c => c.Name == "Measured").Id;
        var nominalRef = schema.Columns.First(c => c.Name == "Nominal").Id;

        // A client trying to write the computed column directly is silently ignored — the server
        // still computes it from Measured/Nominal (both 5, so Deviation stays 0), not "999".
        var row = await Rows().AddRowAsync(datasetId, new Dictionary<Guid, string>
        {
            [measuredRef] = "5",
            [nominalRef] = "5",
            [column!.Id] = "999",
        });

        Assert.Equal("0", row!.Values[column.Id]);
    }

    [Fact]
    public async Task Deleting_a_column_a_formula_depends_on_is_blocked()
    {
        var datasetId = await SeedAsync((1, 1));
        await Formulas().AddFormulaColumnAsync(datasetId, "Deviation", DatasetColumnType.Double, "[Measured] - [Nominal]");
        var schema = await Datasets().GetSchemaAsync(datasetId);
        var measuredRef = schema!.Columns.First(c => c.Name == "Measured").Id;

        await Assert.ThrowsAsync<DataConflictException>(() => Datasets().DeleteColumnAsync(datasetId, measuredRef));
    }

    [Fact]
    public async Task Renaming_a_column_a_formula_depends_on_keeps_the_formula_working()
    {
        var datasetId = await SeedAsync((12.5, 12.0));
        await Formulas().AddFormulaColumnAsync(datasetId, "Deviation", DatasetColumnType.Double, "[Measured] - [Nominal]");
        var schema = await Datasets().GetSchemaAsync(datasetId);
        var measuredRef = schema!.Columns.First(c => c.Name == "Measured").Id;

        await Datasets().UpdateColumnAsync(datasetId, measuredRef, "Actual Diameter", DatasetColumnType.Double);

        var deviation = (await Datasets().GetSchemaAsync(datasetId))!.Columns.First(c => c.Name == "Deviation");
        Assert.False(deviation.FormulaHasError);
        Assert.Equal("[Actual Diameter] - [Nominal]", deviation.FormulaExpression);
        Assert.Equal([0.5], await DeviationValuesAsync(datasetId));
    }

    [Fact]
    public async Task A_dependency_cycle_between_two_formulas_is_rejected()
    {
        var datasetId = await SeedAsync((1, 1));
        var a = await Formulas().AddFormulaColumnAsync(datasetId, "A", DatasetColumnType.Double, "[Measured] + 1");
        await Formulas().AddFormulaColumnAsync(datasetId, "B", DatasetColumnType.Double, "[A] + 1");

        // B now depends on A; editing A to depend back on B closes the loop.
        await Assert.ThrowsAsync<FormulaValidationException>(() =>
            Formulas().UpdateFormulaAsync(datasetId, a!.Id, "A", DatasetColumnType.Double, "[B] + 1"));
    }

    [Fact]
    public async Task Preview_evaluates_without_saving_anything()
    {
        var datasetId = await SeedAsync((12.5, 12.0), (10.0, 10.0));

        var preview = await Formulas().PreviewFormulaAsync(datasetId, DatasetColumnType.Double, "[Measured] - [Nominal]", editingColumnId: null);

        Assert.NotNull(preview);
        Assert.Null(preview!.Error);
        Assert.Equal(2, preview.Rows.Count);
        Assert.Equal("0.5", preview.Rows[0].Value);

        var schema = await Datasets().GetSchemaAsync(datasetId);
        Assert.DoesNotContain(schema!.Columns, c => c.Name.Contains("Deviation"));
    }

    [Fact]
    public async Task Preview_of_an_invalid_formula_returns_an_error_not_a_400()
    {
        var datasetId = await SeedAsync((1, 1));

        var preview = await Formulas().PreviewFormulaAsync(datasetId, DatasetColumnType.Double, "[Nope] + 1", editingColumnId: null);

        Assert.NotNull(preview);
        Assert.NotNull(preview!.Error);
        Assert.Empty(preview.Rows);
    }
}
