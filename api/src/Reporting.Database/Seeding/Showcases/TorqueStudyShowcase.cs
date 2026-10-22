using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>Seal torque across four stations and two shifts, shown as box plots against a spec band.</summary>
internal static class TorqueStudyShowcase
{
    public const string Name = "Torque Calibration Study";

    public static Report Build(SeedBatch batch, int number)
    {
        var now = DateTime.UtcNow;
        var report = new Report { RefId = Guid.NewGuid(), Number = number, Name = Name, CreatedAt = now, UpdatedAt = now };
        var revision = new ReportRevision { RefId = Guid.NewGuid(), Kind = RevisionKind.Draft, CreatedAt = now };

        var dataset = TorqueStudyDataset.Build(batch);
        revision.Datasets.Add(dataset);
        var spec = SpecDatasets.Build(batch, "Torque Spec", "{\"source\":\"assembly\",\"typeId\":7788,\"phaseIds\":[9]}",
            "Seal Torque", 11.00, 13.00, SeedFormats.Unit(2, " Nm"));
        revision.Datasets.Add(spec.Dataset);

        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Box plots", Order = 0 };
        revision.Tabs.Add(tab);
        AddWidgets(tab, batch, dataset, spec);

        report.Revisions.Add(revision);
        return report;
    }

    private static void AddWidgets(Tab tab, SeedBatch batch, Dataset dataset, SpecDataset spec)
    {
        var stationRef = SeedDatasets.ColumnRef(dataset, "Station");
        var shiftRef = SeedDatasets.ColumnRef(dataset, "Shift");
        var torqueRef = SeedDatasets.ColumnRef(dataset, "Seal Torque");
        const string yLabel = "Seal Torque (Nm)";

        tab.Widgets.Add(SeedWidgets.Title("Seal Torque Calibration Study", 0, 0, 48, 2));

        var byStation = SeedWidgets.Placeholder(tab, WidgetType.BoxPlot, 0, 2, 28, 17);
        batch.AddChart(byStation, () =>
            ChartWidgetJson.BoxPlot("Seal torque by station", dataset, stationRef, torqueRef, null, "tukey", yLabel,
                showMean: true, showSampleSize: true, showCapability: true,
                bandsJson: SpecDatasets.BandJson(spec)));

        var byShift = SeedWidgets.Placeholder(tab, WidgetType.BoxPlot, 28, 2, 20, 17);
        batch.AddChart(byShift, () =>
            ChartWidgetJson.BoxPlot("By station & shift", dataset, stationRef, torqueRef, shiftRef, "tukey", yLabel,
                showMean: true, showPoints: true));

        var table = SeedWidgets.Placeholder(tab, WidgetType.DataTable, 0, 19, 48, 11);
        batch.AddTable(table, dataset, "Torque measurements", ["Sample ID", "Station", "Shift", "Operator", "Seal Torque", "Measured At"]);
    }
}
