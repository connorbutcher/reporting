using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// Exercises <see cref="DatasetRepository.GetColumnValuesAsync"/> against a real (SQLite) relational
/// provider, so the distinct/ordered/capped query the filter panel's value dropdowns rely on is
/// proven to translate to SQL.
/// </summary>
public class ColumnValuesTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly ReportingDbContext _db;

    public ColumnValuesTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        using (var pragma = _connection.CreateCommand())
        {
            pragma.CommandText = "PRAGMA foreign_keys = OFF";
            pragma.ExecuteNonQuery();
        }

        var options = new DbContextOptionsBuilder<ReportingDbContext>()
            .UseSqlite(_connection)
            .Options;
        _db = new ReportingDbContext(options);
        _db.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    private DatasetRepository Repo() => new(_db);

    /// <summary>Seeds a "shift" column with the given per-row values and returns its RefId.</summary>
    private async Task<(int DatasetId, Guid ColumnRef)> SeedShiftAsync(params string?[] values)
    {
        var columnRef = Guid.NewGuid();
        var dataset = new Dataset
        {
            Name = "D",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns = { new DatasetColumn { RefId = columnRef, Name = "Shift", Type = DatasetColumnType.String, Order = 0 } },
        };
        _db.Datasets.Add(dataset);
        await _db.SaveChangesAsync();

        var columnId = dataset.Columns[0].Id;
        foreach (var value in values)
        {
            var row = new DatasetRow { DatasetId = dataset.Id, RefId = Guid.NewGuid() };
            row.Cells.Add(new DatasetCell { ColumnId = columnId, StringValue = value });
            _db.DatasetRows.Add(row);
        }
        await _db.SaveChangesAsync();

        return (dataset.Id, columnRef);
    }

    [Fact]
    public async Task Returns_distinct_values_sorted_ignoring_blanks()
    {
        var (datasetId, columnRef) = await SeedShiftAsync("Night", "Day", "Day", "Night", "", null, "Day");

        var values = await Repo().GetColumnValuesAsync(datasetId, columnRef, search: null, limit: 50);

        Assert.Equal(["Day", "Night"], values);
    }

    [Fact]
    public async Task Search_narrows_to_matching_values()
    {
        var (datasetId, columnRef) = await SeedShiftAsync("Day", "Night", "Twilight");

        var values = await Repo().GetColumnValuesAsync(datasetId, columnRef, search: "igh", limit: 50);

        // "Night" and "Twilight" both contain "igh"; "Day" doesn't.
        Assert.Equal(["Night", "Twilight"], values);
    }

    [Fact]
    public async Task Caps_the_number_of_values_returned()
    {
        var many = Enumerable.Range(0, 20).Select(i => $"v{i:D2}").ToArray<string?>();
        var (datasetId, columnRef) = await SeedShiftAsync(many);

        var values = await Repo().GetColumnValuesAsync(datasetId, columnRef, search: null, limit: 5);

        Assert.NotNull(values);
        Assert.Equal(5, values!.Count);
        // Capped after ordering, so it's the first five, not an arbitrary five.
        Assert.Equal(["v00", "v01", "v02", "v03", "v04"], values);
    }

    [Fact]
    public async Task Unknown_column_is_null_not_empty()
    {
        var (datasetId, _) = await SeedShiftAsync("Day");

        var values = await Repo().GetColumnValuesAsync(datasetId, Guid.NewGuid(), search: null, limit: 50);

        Assert.Null(values);
    }
}
