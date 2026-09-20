using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>The LIKE-based text operators, which only translate to SQL, so run against a real (SQLite) provider.</summary>
public class TextFilterSqlTests : SqliteDbTestBase
{
    public TextFilterSqlTests() : base(foreignKeys: false)
    {
    }

    private async Task<(Guid ColumnRef, IReadOnlyDictionary<Guid, DatasetColumn> Columns)> SeedAsync(params string?[] values)
    {
        var columnRef = Guid.NewGuid();
        var dataset = new Dataset
        {
            Name = "D",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns = { new DatasetColumn { RefId = columnRef, Name = "Name", Type = DatasetColumnType.String, Order = 0 } },
        };
        Db.Datasets.Add(dataset);
        await Db.SaveChangesAsync();

        foreach (var value in values)
        {
            var row = new DatasetRow { DatasetId = dataset.Id, RefId = Guid.NewGuid() };
            if (value is not null) row.Cells.Add(new DatasetCell { ColumnId = dataset.Columns[0].Id, StringValue = value });
            Db.DatasetRows.Add(row);
        }
        await Db.SaveChangesAsync();

        return (columnRef, dataset.Columns.ToDictionary(c => c.RefId));
    }

    private async Task<List<string?>> MatchAsync(Guid columnRef, IReadOnlyDictionary<Guid, DatasetColumn> columns, FilterOperator op, string value)
    {
        var filter = new FilterGroupDto
        {
            Children = { new FilterConditionDto { ColumnId = columnRef, Operator = op, Values = [value] } },
        };
        var rows = await FilterTranslator.Apply(Db.DatasetRows.Include(r => r.Cells), filter, columns).ToListAsync();
        return rows.Select(r => r.Cells.FirstOrDefault()?.StringValue).OrderBy(v => v).ToList();
    }

    [Fact]
    public async Task Contains_matches_anywhere_in_the_value()
    {
        var (column, columns) = await SeedAsync("Night shift", "Day", "Twilight", null);

        Assert.Equal(["Night shift", "Twilight"], await MatchAsync(column, columns, FilterOperator.Contains, "igh"));
    }

    [Fact]
    public async Task Starts_with_and_ends_with_anchor_at_each_end()
    {
        var (column, columns) = await SeedAsync("Night shift", "Day shift", "Shift lead");

        Assert.Equal(["Shift lead"], await MatchAsync(column, columns, FilterOperator.StartsWith, "Shift"));
        Assert.Equal(["Day shift", "Night shift"], await MatchAsync(column, columns, FilterOperator.EndsWith, "shift"));
    }

    [Fact]
    public async Task Does_not_contain_keeps_rows_without_the_value_including_those_with_no_cell()
    {
        var (column, columns) = await SeedAsync("Night", "Day", null);

        var kept = await MatchAsync(column, columns, FilterOperator.NotContains, "igh");

        Assert.Equal([null, "Day"], kept);
    }

    [Theory]
    [InlineData("50%", new[] { "50% off" })]
    [InlineData("a_b", new[] { "a_b" })]
    [InlineData("back\\slash", new[] { "back\\slash" })]
    public async Task Wildcard_characters_the_user_types_match_only_themselves(string typed, string[] expected)
    {
        var (column, columns) = await SeedAsync("50% off", "500 off", "a_b", "axb", "back\\slash", "backslash");

        Assert.Equal(expected, await MatchAsync(column, columns, FilterOperator.Contains, typed));
    }
}
