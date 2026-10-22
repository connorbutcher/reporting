using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Formulas;
using Reporting.DAL.Formulas.Catalogue;
using Reporting.DAL.Repositories;
using Reporting.DAL.Widgets;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>
/// Checks the feature tour shows each widget option it claims to, that its formula columns hold what the
/// formula engine computes, that its control charts run in every mode, and that its comments are written.
/// </summary>
public class FeatureTourOptionsSeedTests() : SqliteDbTestBase(foreignKeys: false)
{
    private const string TourName = "Feature Tour — Engine Builds";

    [Fact]
    public void Charts_use_the_newer_chart_options()
    {
        DbSeeder.SeedFeatureShowcase(Db);
        var configs = Configs();

        Assert.Contains(configs, c => Is(c, "percentStacked", true));
        Assert.Contains(configs, c => Is(c, "showStackTotals", true));
        Assert.Contains(configs, c => c.TryGetProperty("sort", out var sort) && sort.ValueKind == JsonValueKind.Object
            && sort.GetProperty("limit").ValueKind == JsonValueKind.Number && sort.GetProperty("showOther").GetBoolean());
        Assert.Contains(configs, c => Text(c, "categoryGrouping") == "month");
        Assert.Contains(configs, c => Text(c, "aggregate") == "average" && Text(c, "xGrouping") == "week");
        Assert.Contains(configs, c => Is(c, "showTrendLine", true));
        Assert.Contains(configs, c => Is(c, "showNormalCurve", true));
        Assert.Contains(configs, c => Is(c, "cumulative", true));
        Assert.Contains(configs, c => Is(c, "connectNulls", true));
        Assert.Contains(configs, c => c.TryGetProperty("guideLines", out var lines) && lines.GetArrayLength() > 0);
    }

    [Fact]
    public void Control_charts_cover_every_subgroup_and_row_mode()
    {
        DbSeeder.SeedFeatureShowcase(Db);
        var modes = Configs().Where(c => Text(c, "type") == "xbarRChart").Select(c => Text(c, "mode")).ToList();

        Assert.Equal(["individuals", "p", "xBarR", "xBarS"], modes.Order(StringComparer.Ordinal));
        Assert.Contains(Configs(), c => Is(c, "runRules", true) && c.GetProperty("baselineSubgroups").GetInt32() == 30);
    }

    [Fact]
    public void Tables_and_pivots_use_totals_search_formatting_and_cross_tabs()
    {
        DbSeeder.SeedFeatureShowcase(Db);
        var configs = Configs();
        var columns = configs.Where(c => Text(c, "type") == "dataTable").SelectMany(c => c.GetProperty("columns").EnumerateArray()).ToList();
        var measures = configs.Where(c => Text(c, "type") == "pivotTable").SelectMany(c => c.GetProperty("measures").EnumerateArray()).ToList();

        Assert.Contains(configs, c => Is(c, "showTotals", true) && Is(c, "showSearch", true) && c.GetProperty("frozenColumns").GetInt32() == 1);
        Assert.Contains(columns, c => c.TryGetProperty("tolerance", out _));
        Assert.Contains(columns, c => c.TryGetProperty("formatRules", out _));
        Assert.Contains(columns, c => Is(c, "dataBars", true));
        Assert.Contains(configs, c => c.TryGetProperty("columnFields", out var fields) && fields.GetArrayLength() > 0);
        Assert.Contains(configs, c => Is(c, "showSubtotals", true) && c.GetProperty("fieldGroupings").GetArrayLength() == 1);
        foreach (var expected in new[] { "countDistinct", "median" })
        {
            Assert.Contains(measures, m => Text(m, "aggregate") == expected);
        }

        foreach (var expected in new[] { "percentOfTotal", "percentOfParent" })
        {
            Assert.Contains(measures, m => Text(m, "showAs") == expected);
        }
    }

    [Fact]
    public async Task Formula_columns_hold_what_a_recalculation_writes()
    {
        DbSeeder.SeedFeatureShowcase(Db);
        var dataset = Db.Datasets.Include(d => d.Columns).Single(d => d.Name == "Engine Build Log");
        var computed = dataset.Columns.Where(c => c.IsComputed).Select(c => c.Id).ToList();
        Assert.Equal(4, computed.Count);
        var seeded = await ComputedCellsAsync(computed);

        await new FormulaCalculationService(Db, new FormulaFunctionCatalogueLoader(Db)).RecalculateAsync(dataset);
        Db.ChangeTracker.Clear();

        Assert.All(Db.DatasetColumns.Where(c => computed.Contains(c.Id)), c => Assert.Null(c.FormulaError));
        Assert.Equal(seeded, await ComputedCellsAsync(computed));
    }

    [Fact]
    public async Task Individuals_and_p_charts_run_over_the_seeded_builds()
    {
        DbSeeder.SeedFeatureShowcase(Db);
        var dataset = Db.Datasets.Include(d => d.Columns).Single(d => d.Name == "Engine Build Log");
        var service = new XBarRChartQueryService(Db, new ChartToleranceBands(new ToleranceResolver(Db)), new DatasetResolver(Db));

        var individuals = await service.QueryForXBarRChartAsync(dataset.Id, new XBarRChartQueryDto
        {
            CategoryColumnId = Ref(dataset, "Build ID"),
            ValueColumnId = Ref(dataset, "Main Bearing Clearance"),
            Mode = ControlChartMode.Individuals,
            BaselineSubgroups = 30,
            RunRules = true,
        });
        var pChart = await service.QueryForXBarRChartAsync(dataset.Id, new XBarRChartQueryDto
        {
            CategoryColumnId = Ref(dataset, "Build Date"),
            ValueColumnId = Ref(dataset, "Rework Count"),
            Mode = ControlChartMode.P,
            CategoryGrouping = DateGrouping.Week,
        });

        Assert.Equal(100, individuals!.Subgroups.Count);
        Assert.Equal(30, individuals.BaselineCount);
        Assert.InRange(pChart!.Subgroups.Count, 14, 16);
    }

    [Fact]
    public void Comments_are_written_by_the_demo_users_with_a_mention_and_an_anchor()
    {
        DbSeeder.SeedIdentity(Db);
        DbSeeder.SeedFeatureShowcase(Db);
        var report = Db.Reports.Single(r => r.Name == TourName);

        var comments = Db.WidgetComments.Include(c => c.Mentions).Where(c => c.ReportId == report.Id).ToList();

        Assert.Equal(3, comments.Count);
        Assert.Contains(comments, c => c.AnchorX is not null && c.AnchorYAxisIndex == 0);
        Assert.Equal(2, comments.Count(c => c.Mentions.Count == 1));
        var widgetRefs = Db.Widgets.Select(w => w.RefId).ToHashSet();
        Assert.All(comments, c => Assert.Contains(c.WidgetRefId, widgetRefs));
    }

    [Fact]
    public void Comments_are_skipped_when_the_demo_users_are_missing()
    {
        DbSeeder.SeedFeatureShowcase(Db);

        Assert.Empty(Db.WidgetComments);
    }

    private List<JsonElement> Configs()
    {
        return Db.Widgets.AsNoTracking().Select(w => w.ConfigJson).AsEnumerable()
            .Select(json => JsonDocument.Parse(json).RootElement)
            .ToList();
    }

    private async Task<List<(int, int, string?, double?, bool?, DateTime?)>> ComputedCellsAsync(List<int> columnIds)
    {
        var cells = await Db.DatasetCells.AsNoTracking()
            .Where(c => columnIds.Contains(c.ColumnId))
            .OrderBy(c => c.RowId).ThenBy(c => c.ColumnId)
            .ToListAsync();
        return cells.Select(c => (c.RowId, c.ColumnId, c.StringValue, c.NumberValue, c.BoolValue, c.DateValue)).ToList();
    }

    private static bool Is(JsonElement element, string property, bool expected)
    {
        return element.TryGetProperty(property, out var value)
            && value.ValueKind is JsonValueKind.True or JsonValueKind.False
            && value.GetBoolean() == expected;
    }

    private static string? Text(JsonElement element, string property)
    {
        return element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;
    }

    private static Guid Ref(Dataset dataset, string name)
    {
        return dataset.Columns.Single(c => c.Name == name).RefId;
    }
}
