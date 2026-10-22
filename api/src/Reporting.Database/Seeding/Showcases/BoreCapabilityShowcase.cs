using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>Bore diameter across three machines as histograms against a spec band.</summary>
internal static class BoreCapabilityShowcase
{
    public const string Name = "Bore Diameter Capability";

    public static Report Build(SeedBatch batch, int number)
    {
        var now = DateTime.UtcNow;
        var report = new Report { RefId = Guid.NewGuid(), Number = number, Name = Name, CreatedAt = now, UpdatedAt = now };
        var revision = new ReportRevision { RefId = Guid.NewGuid(), Kind = RevisionKind.Draft, CreatedAt = now };

        var dataset = BoreCapabilityDataset.Build(batch);
        revision.Datasets.Add(dataset);
        var spec = SpecDatasets.Build(batch, "Bore Diameter Spec", "{\"source\":\"assembly\",\"typeId\":7788,\"phaseIds\":[7]}",
            "Bore Diameter", 101.55, 101.65, SeedFormats.Mm(2));
        revision.Datasets.Add(spec.Dataset);

        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Distribution", Order = 0 };
        revision.Tabs.Add(tab);
        AddWidgets(tab, batch, dataset, spec);

        report.Revisions.Add(revision);
        return report;
    }

    private static void AddWidgets(Tab tab, SeedBatch batch, Dataset dataset, SpecDataset spec)
    {
        var boreRef = SeedDatasets.ColumnRef(dataset, "Bore Diameter");
        var machineRef = SeedDatasets.ColumnRef(dataset, "Machine");
        const string xLabel = "Bore Diameter (mm)";

        tab.Widgets.Add(SeedWidgets.Title("Bore Diameter Capability", 0, 0, 48, 2));

        var overall = SeedWidgets.Placeholder(tab, WidgetType.Histogram, 0, 2, 28, 17);
        batch.AddChart(overall, () =>
            ChartWidgetJson.Histogram("Bore diameter distribution", ChartBindingJson.Binding(dataset.Id, boreRef), xLabel, "Number of builds",
                binMode: "count", binCount: 20, normalize: "count", showLegend: false,
                bandsJson: SpecDatasets.BandJson(spec, axis: "x")));

        // Relative frequency so the differently sized batches are comparable.
        var byMachine = SeedWidgets.Placeholder(tab, WidgetType.Histogram, 28, 2, 20, 17);
        batch.AddChart(byMachine, () =>
            ChartWidgetJson.Histogram("By machine (relative)", ChartBindingJson.Binding(dataset.Id, boreRef, seriesRef: machineRef), xLabel, "Share of builds",
                binMode: "count", binCount: 20, normalize: "frequency", showLegend: true));

        var table = SeedWidgets.Placeholder(tab, WidgetType.DataTable, 0, 19, 48, 11);
        batch.AddTable(table, dataset, "Bore measurements", ["Sample ID", "Machine", "Bore Diameter", "Measured At"]);
    }
}
