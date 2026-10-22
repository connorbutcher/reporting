using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>Pivots by model and line, and by model alone, with one measure of each aggregate kind.</summary>
internal static class ProductionSummaryShowcase
{
    public const string Name = "Production Summary";

    public static Report Build(SeedBatch batch, int number)
    {
        var now = DateTime.UtcNow;
        var report = new Report { RefId = Guid.NewGuid(), Number = number, Name = Name, CreatedAt = now, UpdatedAt = now };
        var revision = new ReportRevision { RefId = Guid.NewGuid(), Kind = RevisionKind.Draft, CreatedAt = now };

        var dataset = ProductionRunsDataset.Build(batch);
        revision.Datasets.Add(dataset);

        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Summary", Order = 0 };
        revision.Tabs.Add(tab);
        AddWidgets(tab, batch, dataset);

        report.Revisions.Add(revision);
        return report;
    }

    private static void AddWidgets(Tab tab, SeedBatch batch, Dataset dataset)
    {
        var modelRef = SeedDatasets.ColumnRef(dataset, "Engine Model");
        var lineRef = SeedDatasets.ColumnRef(dataset, "Assembly Line");
        var measures = StandardPivotMeasures.For(dataset);

        tab.Widgets.Add(SeedWidgets.Title("Production Summary", 0, 0, 48, 2));

        var byModelLine = SeedWidgets.Placeholder(tab, WidgetType.PivotTable, 0, 2, 28, 17);
        batch.AddChart(byModelLine, () => PivotWidgetJson.Config("Builds by model & line", dataset, [modelRef, lineRef], measures));

        var byModel = SeedWidgets.Placeholder(tab, WidgetType.PivotTable, 28, 2, 20, 17);
        batch.AddChart(byModel, () => PivotWidgetJson.Config("Builds by model", dataset, [modelRef], measures));

        var table = SeedWidgets.Placeholder(tab, WidgetType.DataTable, 0, 19, 48, 11);
        batch.AddTable(table, dataset, "Production runs", ["Build ID", "Engine Model", "Assembly Line", "Build Cost", "Build Hours", "Rework Count"]);
    }
}
