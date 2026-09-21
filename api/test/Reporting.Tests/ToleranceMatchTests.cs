using Reporting.Abstractions;
using Reporting.DAL.Widgets;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// A table column's tolerance can opt in to choosing its limits row per data row, by matching a value
/// in the row against a column of the limits dataset, instead of pointing at one fixed limits row.
/// </summary>
public class ToleranceMatchTests : SqliteDbTestBase
{
    private readonly Guid _partRef = Guid.NewGuid();
    private readonly Guid _readingRef = Guid.NewGuid();

    private readonly Guid _limitPartRef = Guid.NewGuid();
    private readonly Guid _minRef = Guid.NewGuid();
    private readonly Guid _maxRef = Guid.NewGuid();
    private readonly Guid _lowerRef = Guid.NewGuid();
    private readonly Guid _upperRef = Guid.NewGuid();

    public ToleranceMatchTests() : base(foreignKeys: false) { }

    private WidgetQueryRepository Repo() => new(Db, new ToleranceResolver(Db));

    private static DatasetColumn Col(Guid refId, string name, DatasetColumnType type, int order) =>
        new() { RefId = refId, Name = name, Type = type, Order = order };

    private async Task<Dataset> SeedDatasetAsync(string name, params DatasetColumn[] columns)
    {
        var dataset = new Dataset { Name = name, DatasetSourceId = 1, ReportRevisionId = 1 };
        foreach (var column in columns) dataset.Columns.Add(column);
        Db.Datasets.Add(dataset);
        await Db.SaveChangesAsync();
        return dataset;
    }

    private void AddRow(Dataset dataset, Guid rowRef, params (DatasetColumn Column, string? Text, double? Number)[] cells)
    {
        var row = new DatasetRow { RefId = rowRef, DatasetId = dataset.Id };
        foreach (var (column, text, number) in cells)
            row.Cells.Add(new DatasetCell { ColumnId = column.Id, StringValue = text, NumberValue = number });
        Db.DatasetRows.Add(row);
    }

    /// <summary>The limits dataset: part A (10–20, concession 8–22) and part B (100–200), plus the row refs.</summary>
    private async Task<(Dataset Limits, Guid ARow, Guid BRow)> SeedLimitsAsync(DatasetColumnType partType = DatasetColumnType.String)
    {
        var limits = await SeedDatasetAsync("Limits",
            Col(_limitPartRef, "Part", partType, 0),
            Col(_minRef, "Min", DatasetColumnType.Double, 1),
            Col(_maxRef, "Max", DatasetColumnType.Double, 2),
            Col(_lowerRef, "Concession low", DatasetColumnType.Double, 3),
            Col(_upperRef, "Concession high", DatasetColumnType.Double, 4));
        var (part, min, max, lower, upper) = (limits.Columns[0], limits.Columns[1], limits.Columns[2], limits.Columns[3], limits.Columns[4]);
        var aRow = Guid.NewGuid();
        var bRow = Guid.NewGuid();
        AddRow(limits, aRow, (part, "A", null), (min, "10", 10), (max, "20", 20), (lower, "8", 8), (upper, "22", 22));
        AddRow(limits, bRow, (part, "B", null), (min, "100", 100), (max, "200", 200), (lower, null, null), (upper, null, null));
        await Db.SaveChangesAsync();
        return (limits, aRow, bRow);
    }

    private ToleranceConfig Matching(Dataset limits) => new()
    {
        SourceDatasetId = limits.Id,
        Match = new ToleranceMatch { ColumnId = _partRef, SourceColumnId = _limitPartRef },
        MinColumnId = _minRef,
        MaxColumnId = _maxRef,
        ConcessionLowerColumnId = _lowerRef,
        ConcessionUpperColumnId = _upperRef,
    };

    private async Task<Dictionary<Guid, ToleranceStatus>> StatusesAsync(Dataset data, ToleranceConfig tolerance)
    {
        var result = await Repo().QueryForTableAsync(data.Id, new TableQueryDto
        {
            Columns = [new DataTableColumnSetting { ColumnId = _readingRef, Tolerance = tolerance }],
        });
        return result!.Rows.ToDictionary(r => r.Id, r => r.Cells[_readingRef].Tolerance);
    }

    private async Task<Dataset> SeedDataAsync(DatasetColumnType partType = DatasetColumnType.String) =>
        await SeedDatasetAsync("Data",
            Col(_partRef, "Part", partType, 0),
            Col(_readingRef, "Reading", DatasetColumnType.Double, 1));

    [Fact]
    public async Task Each_row_is_checked_against_the_limits_row_its_value_matches()
    {
        var (limits, _, _) = await SeedLimitsAsync();
        var data = await SeedDataAsync();
        var (part, reading) = (data.Columns[0], data.Columns[1]);
        Guid a15 = Guid.NewGuid(), a9 = Guid.NewGuid(), a5 = Guid.NewGuid(), b150 = Guid.NewGuid(), b15 = Guid.NewGuid();
        AddRow(data, a15, (part, "A", null), (reading, "15", 15));
        AddRow(data, a9, (part, "A", null), (reading, "9", 9));
        AddRow(data, a5, (part, "A", null), (reading, "5", 5));
        AddRow(data, b150, (part, "B", null), (reading, "150", 150));
        AddRow(data, b15, (part, "B", null), (reading, "15", 15));
        await Db.SaveChangesAsync();

        var status = await StatusesAsync(data, Matching(limits));

        Assert.Equal(ToleranceStatus.Pass, status[a15]);
        Assert.Equal(ToleranceStatus.Concession, status[a9]); // below A's 10, inside its 8 concession bound
        Assert.Equal(ToleranceStatus.Fail, status[a5]);
        Assert.Equal(ToleranceStatus.Pass, status[b150]);
        // The same reading passes for A but is far below B's 100 — proof the limits follow the row.
        Assert.Equal(ToleranceStatus.Fail, status[b15]);
    }

    [Fact]
    public async Task Matching_ignores_case_and_surrounding_spaces_in_text()
    {
        var (limits, _, _) = await SeedLimitsAsync();
        var data = await SeedDataAsync();
        var (part, reading) = (data.Columns[0], data.Columns[1]);
        var row = Guid.NewGuid();
        AddRow(data, row, (part, "  a ", null), (reading, "15", 15));
        await Db.SaveChangesAsync();

        Assert.Equal(ToleranceStatus.Pass, (await StatusesAsync(data, Matching(limits)))[row]);
    }

    [Fact]
    public async Task A_row_with_no_matching_limits_row_or_no_value_is_not_highlighted()
    {
        var (limits, _, _) = await SeedLimitsAsync();
        var data = await SeedDataAsync();
        var (part, reading) = (data.Columns[0], data.Columns[1]);
        Guid unknown = Guid.NewGuid(), blank = Guid.NewGuid(), noKeyCell = Guid.NewGuid();
        AddRow(data, unknown, (part, "Z", null), (reading, "999", 999));
        AddRow(data, blank, (part, "", null), (reading, "999", 999));
        AddRow(data, noKeyCell, (reading, "999", 999));
        await Db.SaveChangesAsync();

        var status = await StatusesAsync(data, Matching(limits));

        Assert.Equal(ToleranceStatus.None, status[unknown]);
        Assert.Equal(ToleranceStatus.None, status[blank]);
        Assert.Equal(ToleranceStatus.None, status[noKeyCell]);
    }

    [Fact]
    public async Task A_numeric_identifier_matches_the_same_number_written_as_text()
    {
        var limits = await SeedDatasetAsync("Limits",
            Col(_limitPartRef, "Part no", DatasetColumnType.String, 0),
            Col(_minRef, "Min", DatasetColumnType.Double, 1),
            Col(_maxRef, "Max", DatasetColumnType.Double, 2));
        AddRow(limits, Guid.NewGuid(), (limits.Columns[0], "1001", null), (limits.Columns[1], "10", 10), (limits.Columns[2], "20", 20));
        var data = await SeedDataAsync(DatasetColumnType.Int);
        var row = Guid.NewGuid();
        AddRow(data, row, (data.Columns[0], "1001", 1001), (data.Columns[1], "25", 25));
        await Db.SaveChangesAsync();

        // The data's part is a number (1001) and the limits' is text ("1001"): the same identifier.
        var tolerance = Matching(limits);
        tolerance.ConcessionLowerColumnId = null;
        tolerance.ConcessionUpperColumnId = null;
        Assert.Equal(ToleranceStatus.Fail, (await StatusesAsync(data, tolerance))[row]);
    }

    [Fact]
    public async Task Where_limits_rows_share_an_identifier_the_first_one_wins()
    {
        var (limits, _, _) = await SeedLimitsAsync();
        var (part, min, max) = (limits.Columns[0], limits.Columns[1], limits.Columns[2]);
        AddRow(limits, Guid.NewGuid(), (part, "A", null), (min, "0", 0), (max, "1000", 1000)); // a later, looser "A"
        var data = await SeedDataAsync();
        var row = Guid.NewGuid();
        AddRow(data, row, (data.Columns[0], "A", null), (data.Columns[1], "500", 500));
        await Db.SaveChangesAsync();

        // 500 would pass the later A (0–1000) but fails the first A (10–20).
        Assert.Equal(ToleranceStatus.Fail, (await StatusesAsync(data, Matching(limits)))[row]);
    }

    [Fact]
    public async Task A_pointer_to_a_removed_limits_column_highlights_nothing_rather_than_failing()
    {
        var (limits, _, _) = await SeedLimitsAsync();
        var data = await SeedDataAsync();
        var row = Guid.NewGuid();
        AddRow(data, row, (data.Columns[0], "A", null), (data.Columns[1], "15", 15));
        await Db.SaveChangesAsync();

        var tolerance = Matching(limits);
        tolerance.MaxColumnId = Guid.NewGuid(); // no longer exists

        Assert.Equal(ToleranceStatus.None, (await StatusesAsync(data, tolerance))[row]);
    }

    [Fact]
    public async Task The_fixed_row_mode_is_unchanged()
    {
        var (limits, aRow, _) = await SeedLimitsAsync();
        var data = await SeedDataAsync();
        Guid onSpec = Guid.NewGuid(), offSpec = Guid.NewGuid();
        // Every row is checked against row A whatever its Part says.
        AddRow(data, onSpec, (data.Columns[0], "B", null), (data.Columns[1], "15", 15));
        AddRow(data, offSpec, (data.Columns[0], "B", null), (data.Columns[1], "150", 150));
        await Db.SaveChangesAsync();

        var tolerance = new ToleranceConfig
        {
            SourceDatasetId = limits.Id,
            SourceRowId = aRow,
            MinColumnId = _minRef,
            MaxColumnId = _maxRef,
        };
        var status = await StatusesAsync(data, tolerance);

        Assert.Equal(ToleranceStatus.Pass, status[onSpec]);
        Assert.Equal(ToleranceStatus.Fail, status[offSpec]);
    }

    [Fact]
    public void Match_keys_agree_across_number_formatting_case_and_spacing()
    {
        Assert.Equal(ToleranceResolver.MatchKey(null, 1001, null), ToleranceResolver.MatchKey(null, 1001.0, null));
        Assert.Equal("1001", ToleranceResolver.MatchKey("ignored", 1001, null));
        Assert.Equal("Ab-1", ToleranceResolver.MatchKey("  Ab-1 ", null, null));
        Assert.Null(ToleranceResolver.MatchKey("   ", null, null));
        Assert.Null(ToleranceResolver.MatchKey(null, null, null));
    }
}
