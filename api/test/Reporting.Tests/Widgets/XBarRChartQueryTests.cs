using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Repositories;
using Reporting.DAL.Widgets;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// Exercises <see cref="XBarRChartQueryService.QueryForXBarRChartAsync"/> against a real (SQLite)
/// relational provider: the subgroup projection translates to SQL, and the in-memory mean/range
/// reduction plus the Shewhart control-limit constants are proven correct against hand-worked
/// numbers.
/// </summary>
public class XBarRChartQueryTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly ReportingDbContext _db;

    public XBarRChartQueryTests()
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
    }

    private XBarRChartQueryService Repo()
    {
        return new(_db, new ChartToleranceBands(new ToleranceResolver(_db)), new DatasetResolver(_db));
    }

    [Fact]
    public async Task QueryForXBarR_computes_means_ranges_and_control_limits_for_equal_subgroups()
    {
        var categoryRef = Guid.NewGuid();
        var valueRef = Guid.NewGuid();

        var dataset = new Dataset
        {
            Name = "D",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns =
            {
                new DatasetColumn { RefId = categoryRef, Name = "Batch", Type = DatasetColumnType.String, Order = 0 },
                new DatasetColumn { RefId = valueRef, Name = "Value", Type = DatasetColumnType.Double, Order = 1 },
            },
        };
        _db.Datasets.Add(dataset);
        await _db.SaveChangesAsync();

        var categoryId = dataset.Columns[0].Id;
        var valueId = dataset.Columns[1].Id;

        // Three subgroups of n=5, each with range 8: means 14, 15, 13 → XBarBar=14, RBar=8.
        foreach (var v in new[] { 10d, 12, 14, 16, 18 })
        {
            AddRow(dataset.Id, categoryId, "A", valueId, v);
        }

        foreach (var v in new[] { 11d, 13, 15, 17, 19 })
        {
            AddRow(dataset.Id, categoryId, "B", valueId, v);
        }

        foreach (var v in new[] { 9d, 11, 13, 15, 17 })
        {
            AddRow(dataset.Id, categoryId, "C", valueId, v);
        }

        await _db.SaveChangesAsync();

        var result = await Repo().QueryForXBarRChartAsync(dataset.Id, new XBarRChartQueryDto
        {
            CategoryColumnId = categoryRef,
            ValueColumnId = valueRef,
        });

        Assert.NotNull(result);
        Assert.Equal(["A", "B", "C"], result!.Categories);
        Assert.Equal(14d, result.XBarCenterLine, precision: 9);
        Assert.Equal(8d, result.RCenterLine, precision: 9);

        var a = result.Subgroups[0];
        Assert.Equal(14d, a.Mean, precision: 9);
        Assert.Equal(8d, a.Range, precision: 9);
        Assert.Equal(5, a.Count);

        // n=5: A2=0.577, D3=0, D4=2.114 (standard Shewhart constants).
        Assert.Equal(14 + 0.577 * 8, a.XBarUcl, precision: 3);
        Assert.Equal(14 - 0.577 * 8, a.XBarLcl, precision: 3);
        Assert.Equal(0d, a.RLcl, precision: 9);
        Assert.Equal(2.114 * 8, a.RUcl, precision: 3);

        // Every subgroup's mean and range sit well inside these limits.
        Assert.All(result.Subgroups, s =>
        {
            Assert.False(s.MeanOutOfControl);
            Assert.False(s.RangeOutOfControl);
        });
    }

    [Fact]
    public async Task QueryForXBarR_excludes_single_row_subgroups_from_the_average_range()
    {
        var categoryRef = Guid.NewGuid();
        var valueRef = Guid.NewGuid();

        var dataset = new Dataset
        {
            Name = "D",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns =
            {
                new DatasetColumn { RefId = categoryRef, Name = "Batch", Type = DatasetColumnType.String, Order = 0 },
                new DatasetColumn { RefId = valueRef, Name = "Value", Type = DatasetColumnType.Double, Order = 1 },
            },
        };
        _db.Datasets.Add(dataset);
        await _db.SaveChangesAsync();

        var categoryId = dataset.Columns[0].Id;
        var valueId = dataset.Columns[1].Id;

        AddRow(dataset.Id, categoryId, "A", valueId, 10d);
        AddRow(dataset.Id, categoryId, "A", valueId, 14d); // range 4
        AddRow(dataset.Id, categoryId, "B", valueId, 20d);
        AddRow(dataset.Id, categoryId, "B", valueId, 26d); // range 6
        AddRow(dataset.Id, categoryId, "C", valueId, 100d); // lone value: range 0, excluded from RBar
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForXBarRChartAsync(dataset.Id, new XBarRChartQueryDto
        {
            CategoryColumnId = categoryRef,
            ValueColumnId = valueRef,
        });

        Assert.NotNull(result);
        // (4 + 6) / 2, not (4 + 6 + 0) / 3 — the lone-value subgroup doesn't bias it toward zero.
        Assert.Equal(5d, result!.RCenterLine, precision: 9);

        var c = result.Subgroups[2];
        Assert.Equal(0d, c.Range);
        Assert.Equal(1, c.Count);
        // A range that can't exist (n=1) is never flagged, however the limits happen to fall.
        Assert.False(c.RangeOutOfControl);
    }

    [Fact]
    public async Task QueryForXBarR_flags_a_subgroup_whose_mean_breaches_its_control_limits()
    {
        var categoryRef = Guid.NewGuid();
        var valueRef = Guid.NewGuid();

        var dataset = new Dataset
        {
            Name = "D",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns =
            {
                new DatasetColumn { RefId = categoryRef, Name = "Batch", Type = DatasetColumnType.String, Order = 0 },
                new DatasetColumn { RefId = valueRef, Name = "Value", Type = DatasetColumnType.Double, Order = 1 },
            },
        };
        _db.Datasets.Add(dataset);
        await _db.SaveChangesAsync();

        var categoryId = dataset.Columns[0].Id;
        var valueId = dataset.Columns[1].Id;

        // Ten identical, tightly-packed subgroups (n=2, mean 10, range 2) so the grand mean stays
        // anchored near them even with one outlier mixed in…
        for (var i = 0; i < 10; i++)
        {
            var label = $"Normal{i}";
            AddRow(dataset.Id, categoryId, label, valueId, 9d);
            AddRow(dataset.Id, categoryId, label, valueId, 11d);
        }
        // …then one subgroup (same range, so it doesn't itself skew RBar) whose mean sits well past
        // the limits that narrow a band produces.
        AddRow(dataset.Id, categoryId, "Outlier", valueId, 19d);
        AddRow(dataset.Id, categoryId, "Outlier", valueId, 21d);
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForXBarRChartAsync(dataset.Id, new XBarRChartQueryDto
        {
            CategoryColumnId = categoryRef,
            ValueColumnId = valueRef,
        });

        Assert.NotNull(result);
        var outlier = result!.Subgroups[10];
        Assert.Equal(20d, outlier.Mean, precision: 9);
        Assert.True(outlier.MeanOutOfControl);
        Assert.False(result.Subgroups[0].MeanOutOfControl);
    }

    [Fact]
    public async Task QueryForXBarR_orders_subgroups_by_the_category_columns_own_order()
    {
        var categoryRef = Guid.NewGuid();
        var valueRef = Guid.NewGuid();

        var dataset = new Dataset
        {
            Name = "D",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns =
            {
                new DatasetColumn { RefId = categoryRef, Name = "Sample", Type = DatasetColumnType.Int, Order = 0 },
                new DatasetColumn { RefId = valueRef, Name = "Value", Type = DatasetColumnType.Double, Order = 1 },
            },
        };
        _db.Datasets.Add(dataset);
        await _db.SaveChangesAsync();

        var categoryId = dataset.Columns[0].Id;
        var valueId = dataset.Columns[1].Id;

        // Inserted out of numeric order — the result should still read 1, 2, 3.
        AddNumberRow(dataset.Id, (categoryId, 3), (valueId, 30));
        AddNumberRow(dataset.Id, (categoryId, 1), (valueId, 10));
        AddNumberRow(dataset.Id, (categoryId, 2), (valueId, 20));
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForXBarRChartAsync(dataset.Id, new XBarRChartQueryDto
        {
            CategoryColumnId = categoryRef,
            ValueColumnId = valueRef,
        });

        Assert.NotNull(result);
        Assert.Equal(["1", "2", "3"], result!.Categories);
    }

    [Fact]
    public async Task QueryForXBarR_formats_a_date_subgroup_label_instead_of_the_raw_stored_text()
    {
        var categoryRef = Guid.NewGuid();
        var valueRef = Guid.NewGuid();

        var dataset = new Dataset
        {
            Name = "D",
            DatasetSourceId = 1,
            ReportRevisionId = 1,
            Columns =
            {
                new DatasetColumn { RefId = categoryRef, Name = "Build Date", Type = DatasetColumnType.DateTime, Order = 0 },
                new DatasetColumn { RefId = valueRef, Name = "Value", Type = DatasetColumnType.Double, Order = 1 },
            },
        };
        _db.Datasets.Add(dataset);
        await _db.SaveChangesAsync();

        var categoryId = dataset.Columns[0].Id;
        var valueId = dataset.Columns[1].Id;

        // The raw stored text is the ISO round-trip string, exactly what a real import/seed stores —
        // never a display-formatted date.
        var when = new DateTime(2026, 1, 6, 0, 0, 0, DateTimeKind.Utc);
        foreach (var v in new[] { 1d, 2d })
        {
            var row = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = dataset.Id };
            row.Cells.Add(new DatasetCell { ColumnId = categoryId, DateValue = when, StringValue = when.ToString("O") });
            row.Cells.Add(new DatasetCell { ColumnId = valueId, NumberValue = v, StringValue = v.ToString() });
            _db.DatasetRows.Add(row);
        }
        await _db.SaveChangesAsync();

        var result = await Repo().QueryForXBarRChartAsync(dataset.Id, new XBarRChartQueryDto
        {
            CategoryColumnId = categoryRef,
            ValueColumnId = valueRef,
        });

        Assert.NotNull(result);
        var category = Assert.Single(result!.Categories);
        // The default date format (no column config set), not the raw "2026-01-06T00:00:00..." text.
        Assert.Equal("06/01/2026", category);
    }

    private void AddRow(int datasetId, int categoryCol, string category, int valueCol, double value)
    {
        var row = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = datasetId };
        row.Cells.Add(new DatasetCell { ColumnId = categoryCol, StringValue = category });
        row.Cells.Add(new DatasetCell { ColumnId = valueCol, NumberValue = value, StringValue = value.ToString() });
        _db.DatasetRows.Add(row);
    }

    private void AddNumberRow(int datasetId, params (int ColumnId, double Value)[] cells)
    {
        var row = new DatasetRow { RefId = Guid.NewGuid(), DatasetId = datasetId };
        foreach (var (columnId, value) in cells)
        {
            row.Cells.Add(new DatasetCell { ColumnId = columnId, NumberValue = value, StringValue = value.ToString() });
        }
        _db.DatasetRows.Add(row);
    }
}
