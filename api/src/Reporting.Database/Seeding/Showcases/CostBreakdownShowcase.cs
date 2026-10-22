using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>Per-build cost components as a stacked column chart and a grouped variant.</summary>
internal static class CostBreakdownShowcase
{
    public const string Name = "Build Cost Breakdown";

    public static Report Build(SeedBatch batch, int number)
    {
        var now = DateTime.UtcNow;
        var report = new Report { RefId = Guid.NewGuid(), Number = number, Name = Name, CreatedAt = now, UpdatedAt = now };
        var revision = new ReportRevision { RefId = Guid.NewGuid(), Kind = RevisionKind.Draft, CreatedAt = now };

        var dataset = CostBreakdownDataset.Build(batch);
        revision.Datasets.Add(dataset);

        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Cost breakdown", Order = 0 };
        revision.Tabs.Add(tab);
        AddWidgets(tab, batch, dataset);

        report.Revisions.Add(revision);
        return report;
    }

    private static void AddWidgets(Tab tab, SeedBatch batch, Dataset dataset)
    {
        var modelRef = SeedDatasets.ColumnRef(dataset, "Engine Model");
        var costRefs = new[] { "Material Cost", "Machining Cost", "Assembly Labour", "QA & Test" }
            .Select(n => SeedDatasets.ColumnRef(dataset, n))
            .ToArray();
        const string yLabel = "Cost (£)";

        tab.Widgets.Add(SeedWidgets.Title("Build Cost Breakdown", 0, 0, 48, 2));

        var stacked = SeedWidgets.Placeholder(tab, WidgetType.BarChart, 0, 2, 28, 17);
        batch.AddChart(stacked, () =>
            ChartWidgetJson.Bar("Average build cost by model", dataset, modelRef, costRefs, "average", stacked: true, horizontal: false, yLabel));

        var grouped = SeedWidgets.Placeholder(tab, WidgetType.BarChart, 28, 2, 20, 17);
        batch.AddChart(grouped, () =>
            ChartWidgetJson.Bar("Cost components compared", dataset, modelRef, costRefs, "average", stacked: false, horizontal: false, yLabel));

        var table = SeedWidgets.Placeholder(tab, WidgetType.DataTable, 0, 19, 48, 11);
        batch.AddTable(table, dataset, "Per-build costs", ["Build ID", "Engine Model", "Material Cost", "Machining Cost", "Assembly Labour", "QA & Test"]);
    }
}
