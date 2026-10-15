using Reporting.Abstractions;
using Reporting.DAL;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// A filtered dataset wraps a base dataset plus a saved filter, with no rows or columns of its
/// own — <see cref="DatasetResolver"/> makes it transparent to every reader. Covers the resolver's
/// row/schema behaviour, AND-composition with a caller's own filter, chaining, cycle rejection, and
/// the mutation guards that keep a filtered dataset read-only.
/// </summary>
public class FilteredDatasetTests : SqliteDbTestBase
{
    private readonly Guid _regionRef = Guid.NewGuid();
    private readonly Guid _valueRef = Guid.NewGuid();

    public FilteredDatasetTests() : base(foreignKeys: false) { }

    private DatasetRepository Repo() => new(
        Db,
        new Reporting.DAL.Formulas.FormulaCalculationService(Db, new Reporting.DAL.Formulas.Catalogue.FormulaFunctionCatalogueLoader(Db)),
        new DatasetResolver(Db));

    /// <summary>Three rows: two "North" (10, 20), one "South" (5).</summary>
    private async Task<Dataset> SeedBaseAsync()
    {
        var dataset = new Dataset
        {
            Name = "Base",
            ReportRevisionId = 1,
            DatasetSourceId = DatasetSourceIds.Specification,
            Columns =
            {
                new DatasetColumn { RefId = _regionRef, Name = "Region", Type = DatasetColumnType.String, Order = 0 },
                new DatasetColumn { RefId = _valueRef, Name = "Value", Type = DatasetColumnType.Double, Order = 1 },
            },
        };
        Db.Datasets.Add(dataset);
        await Db.SaveChangesAsync();

        var regionId = dataset.Columns.First(c => c.RefId == _regionRef).Id;
        var valueId = dataset.Columns.First(c => c.RefId == _valueRef).Id;

        void AddRow(string region, double value) => Db.DatasetRows.Add(new DatasetRow
        {
            RefId = Guid.NewGuid(),
            DatasetId = dataset.Id,
            Cells =
            {
                new DatasetCell { ColumnId = regionId, StringValue = region },
                new DatasetCell { ColumnId = valueId, NumberValue = value, StringValue = value.ToString() },
            },
        });
        AddRow("North", 10);
        AddRow("North", 20);
        AddRow("South", 5);
        await Db.SaveChangesAsync();
        return dataset;
    }

    private async Task<Dataset> SeedFilteredAsync(int baseId, FilterGroupDto filter)
    {
        var dataset = new Dataset { Name = "Filtered", ReportRevisionId = 1, DatasetSourceId = DatasetSourceIds.Filtered };
        dataset.SetSourceConfig(new FilteredDatasetSourceConfig { BaseDatasetId = baseId, Filter = filter });
        Db.Datasets.Add(dataset);
        await Db.SaveChangesAsync();
        return dataset;
    }

    private FilterGroupDto RegionEquals(string region) => new()
    {
        Join = FilterJoin.And,
        Children = { new FilterConditionDto { ColumnId = _regionRef, Operator = FilterOperator.Equals, Values = { region } } },
    };

    private FilterGroupDto ValueAbove(double threshold) => new()
    {
        Join = FilterJoin.And,
        Children = { new FilterConditionDto { ColumnId = _valueRef, Operator = FilterOperator.GreaterThan, Values = { threshold.ToString() } } },
    };

    [Fact]
    public async Task Query_against_filtered_dataset_returns_only_matching_rows()
    {
        var baseDataset = await SeedBaseAsync();
        var filtered = await SeedFilteredAsync(baseDataset.Id, RegionEquals("North"));

        var result = await Repo().QueryAsync(filtered.Id, null);

        Assert.NotNull(result);
        Assert.Equal(2, result!.TotalRowCount);
        Assert.Equal(2, result.MatchedRowCount);
        Assert.Equal(2, result.Rows.Count);
    }

    [Fact]
    public async Task Request_filter_ands_with_the_saved_filter()
    {
        var baseDataset = await SeedBaseAsync();
        var filtered = await SeedFilteredAsync(baseDataset.Id, RegionEquals("North"));

        var result = await Repo().QueryAsync(filtered.Id, ValueAbove(15));

        // "Total" is the filtered dataset's own size (the two North rows); "Matched" narrows
        // further by the caller's own filter, to the one North row valued above 15.
        Assert.Equal(2, result!.TotalRowCount);
        Assert.Equal(1, result.MatchedRowCount);
    }

    [Fact]
    public async Task Schema_shows_the_base_datasets_columns()
    {
        var baseDataset = await SeedBaseAsync();
        var filtered = await SeedFilteredAsync(baseDataset.Id, RegionEquals("North"));

        var schema = await Repo().GetSchemaAsync(filtered.Id);

        Assert.NotNull(schema);
        Assert.Equal(DatasetSourceKey.Filtered, schema!.Source);
        Assert.Equal(2, schema.Columns.Count);
        Assert.Contains(schema.Columns, c => c.Id == _regionRef);
        Assert.Contains(schema.Columns, c => c.Id == _valueRef);
    }

    [Fact]
    public async Task Chained_filtered_datasets_combine_both_filters()
    {
        var baseDataset = await SeedBaseAsync();
        var filtered = await SeedFilteredAsync(baseDataset.Id, RegionEquals("North"));
        var chained = await SeedFilteredAsync(filtered.Id, ValueAbove(15));

        var result = await Repo().QueryAsync(chained.Id, null);

        Assert.Equal(1, result!.TotalRowCount);
        Assert.Equal(1, result.MatchedRowCount);
    }

    [Fact]
    public async Task Cannot_filter_a_dataset_on_itself()
    {
        var baseDataset = await SeedBaseAsync();
        var filtered = await SeedFilteredAsync(baseDataset.Id, RegionEquals("North"));

        await Assert.ThrowsAsync<DataValidationException>(() => Repo().UpdateSourceConfigAsync(
            filtered.Id, new FilteredDatasetSourceConfig { BaseDatasetId = filtered.Id, Filter = new FilterGroupDto() }));
    }

    [Fact]
    public async Task Rejects_a_base_that_would_create_a_cycle()
    {
        var baseDataset = await SeedBaseAsync();
        var filtered = await SeedFilteredAsync(baseDataset.Id, RegionEquals("North"));
        var chained = await SeedFilteredAsync(filtered.Id, new FilterGroupDto());

        // Pointing `filtered` at `chained` would cycle: filtered -> chained -> filtered.
        await Assert.ThrowsAsync<DataValidationException>(() => Repo().UpdateSourceConfigAsync(
            filtered.Id, new FilteredDatasetSourceConfig { BaseDatasetId = chained.Id, Filter = new FilterGroupDto() }));
    }

    [Fact]
    public async Task Rejects_a_base_dataset_that_does_not_exist()
    {
        var baseDataset = await SeedBaseAsync();
        var filtered = await SeedFilteredAsync(baseDataset.Id, new FilterGroupDto());

        await Assert.ThrowsAsync<DataValidationException>(() => Repo().UpdateSourceConfigAsync(
            filtered.Id, new FilteredDatasetSourceConfig { BaseDatasetId = 999_999, Filter = new FilterGroupDto() }));
    }

    [Fact]
    public async Task Rejects_a_tolerance_operator_in_the_saved_filter()
    {
        var baseDataset = await SeedBaseAsync();
        var filtered = await SeedFilteredAsync(baseDataset.Id, new FilterGroupDto());

        var toleranceFilter = new FilterGroupDto
        {
            Children = { new FilterConditionDto { ColumnId = _valueRef, Operator = FilterOperator.InTolerance } },
        };

        await Assert.ThrowsAsync<DataValidationException>(() => Repo().UpdateSourceConfigAsync(
            filtered.Id, new FilteredDatasetSourceConfig { BaseDatasetId = baseDataset.Id, Filter = toleranceFilter }));
    }

    [Fact]
    public async Task Cannot_add_a_column_to_a_filtered_dataset()
    {
        var baseDataset = await SeedBaseAsync();
        var filtered = await SeedFilteredAsync(baseDataset.Id, RegionEquals("North"));

        await Assert.ThrowsAsync<DataValidationException>(() => Repo().AddColumnAsync(filtered.Id, "New", DatasetColumnType.String));
    }

    [Fact]
    public async Task Column_usage_reports_the_dependent_filtered_dataset()
    {
        var baseDataset = await SeedBaseAsync();
        var filtered = await SeedFilteredAsync(baseDataset.Id, RegionEquals("North"));

        var usage = await new DatasetColumnUsageService(Db).GetAsync(baseDataset.Id);

        Assert.NotNull(usage);
        var regionUses = usage!.Columns.Single(c => c.ColumnId == _regionRef).Uses;
        Assert.Contains(regionUses, u => u.Kind == ColumnUseKind.FilteredDataset && u.WidgetTitle == "Filtered");
    }
}
