using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>The distribution charts, all against the clearance spec.</summary>
internal static class FeatureTourQualityTab
{
    public static void Add(ReportRevision revision, SeedBatch batch, FeatureTourContext context)
    {
        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Quality", Order = 4, Rows = 47 };
        revision.Tabs.Add(tab);
        tab.Widgets.Add(SeedWidgets.Title("Quality & capability", 0, 0, 48, 2));
        tab.Widgets.Add(SeedWidgets.Paragraph(
            "Hover a box for its quartiles, sample size and Pp/Ppk against the spec. Out-of-spec builds get a dashed outline, "
            + "so the status doesn't rely on colour alone. Use View data in a chart's header for the numbers as a table.",
            0, 2, 48, 3));

        AddBoxPlots(tab, batch, context);
        AddHistograms(tab, batch, context);
    }

    private static void AddBoxPlots(Tab tab, SeedBatch batch, FeatureTourContext context)
    {
        var log = context.Log;
        var clearanceRef = context.Ref("Main Bearing Clearance");

        var box = SeedWidgets.Placeholder(tab, WidgetType.BoxPlot, 0, 5, 24, 16);
        batch.AddChart(box, () =>
            ChartWidgetJson.BoxPlot("Bearing clearance by engine", log, context.Ref("Engine Type"), clearanceRef, null, "tukey", "Clearance (mm)",
                showMean: true, showSampleSize: true, showCapability: true,
                bandsJson: SpecDatasets.BandJson(context.Spec)));

        var monthly = SeedWidgets.Placeholder(tab, WidgetType.BoxPlot, 24, 5, 24, 16);
        batch.AddChart(monthly, () =>
            ChartWidgetJson.BoxPlot("Build hours by month and line (points shown)", log, context.Ref("Build Date"), context.Ref("Build Hours"),
                context.Ref("Assembly Line"), "minMax", "Build hours",
                showPoints: true, categoryGrouping: "month"));
    }

    private static void AddHistograms(Tab tab, SeedBatch batch, FeatureTourContext context)
    {
        var log = context.Log;
        var engineRef = context.Ref("Engine Type");
        var clearanceRef = context.Ref("Main Bearing Clearance");

        var histogram = SeedWidgets.Placeholder(tab, WidgetType.Histogram, 0, 21, 24, 14);
        batch.AddChart(histogram, () =>
            ChartWidgetJson.Histogram("Bearing clearance distribution (fitted normal curve)", ChartBindingJson.Binding(log.Id, clearanceRef),
                "Clearance (mm)", "Number of builds",
                binMode: "count", binCount: 20, normalize: "count", showLegend: false,
                bandsJson: SpecDatasets.BandJson(context.Spec, axis: "x"), showNormalCurve: true));

        var cumulative = SeedWidgets.Placeholder(tab, WidgetType.Histogram, 24, 21, 24, 14);
        batch.AddChart(cumulative, () =>
            ChartWidgetJson.Histogram("Build cost, cumulative share", ChartBindingJson.Binding(log.Id, context.Ref("Build Cost")),
                "Build cost (£)", "Share of builds",
                binMode: "auto", binCount: 10, normalize: "frequency", showLegend: false, cumulative: true));

        // The same column bound twice, each narrowed to one engine, on shared bins.
        var byEngine = SeedWidgets.Placeholder(tab, WidgetType.Histogram, 0, 35, 48, 12);
        batch.AddChart(byEngine, () =>
            ChartWidgetJson.Histogram("Bearing clearance: V8 vs V12",
                string.Join(",",
                    ChartBindingJson.Binding(log.Id, clearanceRef, label: "V8 5.0L",
                        filterJson: FilterJson.Group("and", FilterJson.Condition(engineRef, "equals", "V8 5.0L"))),
                    ChartBindingJson.Binding(log.Id, clearanceRef, label: "V12 6.5L",
                        filterJson: FilterJson.Group("and", FilterJson.Condition(engineRef, "equals", "V12 6.5L")))),
                "Clearance (mm)", "Number of builds",
                binMode: "count", binCount: 24, normalize: "count", showLegend: true,
                bandsJson: SpecDatasets.BandJson(context.Spec, axis: "x")));
    }
}
