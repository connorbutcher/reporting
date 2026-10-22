using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>The distribution charts and a control chart, all against the clearance spec.</summary>
internal static class FeatureTourQualityTab
{
    public static void Add(ReportRevision revision, SeedBatch batch, FeatureTourContext context)
    {
        // Taller than the default so the control chart's two grids fit below the histograms.
        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Quality", Order = 3, Rows = 50 };
        revision.Tabs.Add(tab);
        tab.Widgets.Add(SeedWidgets.Title("Quality & capability", 0, 0, 48, 2));

        var log = context.Log;
        var spec = context.Spec;
        var engineRef = context.Ref("Engine Type");
        var clearanceRef = context.Ref("Main Bearing Clearance");
        var inspectorRef = context.Ref("Inspector");

        var box = SeedWidgets.Placeholder(tab, WidgetType.BoxPlot, 0, 2, 24, 16);
        batch.AddChart(box, () =>
            ChartWidgetJson.BoxPlot("Bearing clearance by engine", log, engineRef, clearanceRef, null, "tukey", "Clearance (mm)",
                showMean: true, showSampleSize: true, showCapability: true,
                bandsJson: SpecDatasets.BandJson(spec)));

        var histogram = SeedWidgets.Placeholder(tab, WidgetType.Histogram, 24, 2, 24, 16);
        batch.AddChart(histogram, () =>
            ChartWidgetJson.Histogram("Bearing clearance distribution", ChartBindingJson.Binding(log.Id, clearanceRef), "Clearance (mm)", "Number of builds",
                binMode: "count", binCount: 24, normalize: "count", showLegend: false,
                bandsJson: SpecDatasets.BandJson(spec, axis: "x")));

        // The same column bound twice, each narrowed to one engine, on shared bins.
        var byEngine = SeedWidgets.Placeholder(tab, WidgetType.Histogram, 0, 18, 48, 12);
        batch.AddChart(byEngine, () =>
            ChartWidgetJson.Histogram("Bearing clearance: V8 vs V12",
                string.Join(",",
                    ChartBindingJson.Binding(log.Id, clearanceRef, label: "V8 5.0L",
                        filterJson: FilterJson.Group("and", FilterJson.Condition(engineRef, "equals", "V8 5.0L"))),
                    ChartBindingJson.Binding(log.Id, clearanceRef, label: "V12 6.5L",
                        filterJson: FilterJson.Group("and", FilterJson.Condition(engineRef, "equals", "V12 6.5L")))),
                "Clearance (mm)", "Number of builds",
                binMode: "count", binCount: 24, normalize: "count", showLegend: true,
                bandsJson: SpecDatasets.BandJson(spec, axis: "x")));

        var xbarR = SeedWidgets.Placeholder(tab, WidgetType.XBarRChart, 0, 30, 48, 20);
        batch.AddChart(xbarR, () =>
            ChartWidgetJson.XBarR("Bearing clearance control (by inspector)", log, inspectorRef, clearanceRef, "Clearance (mm)",
                bandsJson: SpecDatasets.BandJson(spec)));
    }
}
