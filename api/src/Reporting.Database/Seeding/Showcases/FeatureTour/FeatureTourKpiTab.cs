using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>KPI tiles covering both value sources, every comparison mode, thresholds, sparkline, meter and grouping.</summary>
internal static class FeatureTourKpiTab
{
    public static void Add(ReportRevision revision, SeedBatch batch, FeatureTourContext context)
    {
        var tab = new Tab { RefId = Guid.NewGuid(), Name = "KPIs", Order = 4 };
        revision.Tabs.Add(tab);
        tab.Widgets.Add(SeedWidgets.Title("KPI tiles", 0, 0, 48, 2));
        tab.Widgets.Add(SeedWidgets.Paragraph(
            "One headline number reduced from the build log — a plain aggregate or a tolerance-band out-of-limits check, "
            + "optionally compared against a fixed target or the previous period, with status thresholds, a trend sparkline, "
            + "a target meter, or split into a grouped row of mini-tiles.",
            0, 2, 48, 3));

        AddSingleValueRow(tab, batch, context);
        AddVariantRow(tab, batch, context);
    }

    private static void AddSingleValueRow(Tab tab, SeedBatch batch, FeatureTourContext context)
    {
        var log = context.Log;
        var costRef = context.Ref("Build Cost");
        var clearanceRef = context.Ref("Main Bearing Clearance");
        var powerRef = context.Ref("Peak Power");
        var dateRef = context.Ref("Build Date");

        var buildCount = SeedWidgets.Placeholder(tab, WidgetType.Kpi, 0, 5, 12, 9);
        batch.AddChart(buildCount, () =>
            KpiWidgetJson.Config("Builds logged", log, "aggregate", "count", null, "null", "fail", true,
                "none", null, null, 7, "higherIsBetter", "", "", 0));

        // Thresholds straddle the seeded average (~£7,380) so the tile shows the warning state.
        var avgCost = SeedWidgets.Placeholder(tab, WidgetType.Kpi, 12, 5, 12, 9);
        batch.AddChart(avgCost, () =>
            KpiWidgetJson.Config("Average build cost", log, "aggregate", "average", costRef, "null", "fail", true,
                "fixedTarget", 7000, null, 7, "lowerIsBetter", "£", "", 0,
                thresholdsEnabled: true, warningThreshold: 7200, criticalThreshold: 7800));

        var outOfSpec = SeedWidgets.Placeholder(tab, WidgetType.Kpi, 24, 5, 12, 9);
        batch.AddChart(outOfSpec, () =>
            KpiWidgetJson.Config("Bearing clearance out of spec", log, "toleranceOutOfLimits", "sum", clearanceRef,
                SpecDatasets.KpiToleranceJson(context.Spec), "fail", true,
                "fixedTarget", 5, null, 7, "lowerIsBetter", "", "%", 1,
                thresholdsEnabled: true, warningThreshold: 3, criticalThreshold: 6));

        var powerTrend = SeedWidgets.Placeholder(tab, WidgetType.Kpi, 36, 5, 12, 9);
        batch.AddChart(powerTrend, () =>
            KpiWidgetJson.Config("Peak power vs last period", log, "aggregate", "average", powerRef, "null", "fail", true,
                "previousPeriod", null, dateRef, 30, "higherIsBetter", "", " kW", 0));
    }

    private static void AddVariantRow(Tab tab, SeedBatch batch, FeatureTourContext context)
    {
        var log = context.Log;
        var costRef = context.Ref("Build Cost");
        var clearanceRef = context.Ref("Main Bearing Clearance");
        var dateRef = context.Ref("Build Date");
        var lineRef = context.Ref("Assembly Line");
        var inspectorRef = context.Ref("Inspector");

        var costTrend = SeedWidgets.Placeholder(tab, WidgetType.Kpi, 0, 14, 12, 9);
        batch.AddChart(costTrend, () =>
            KpiWidgetJson.Config("Average build cost (trend)", log, "aggregate", "average", costRef, "null", "fail", true,
                "none", null, dateRef, 14, "lowerIsBetter", "£", "", 0,
                showSparkline: true, sparklinePeriods: 6));

        var costMeter = SeedWidgets.Placeholder(tab, WidgetType.Kpi, 12, 14, 12, 9);
        batch.AddChart(costMeter, () =>
            KpiWidgetJson.Config("Average build cost (meter)", log, "aggregate", "average", costRef, "null", "fail", true,
                "fixedTarget", 9000, null, 7, "lowerIsBetter", "£", "", 0,
                showAsMeter: true));

        var outOfSpecByLine = SeedWidgets.Placeholder(tab, WidgetType.Kpi, 24, 14, 12, 9);
        batch.AddChart(outOfSpecByLine, () =>
            KpiWidgetJson.Config("Clearance out of spec by line", log, "toleranceOutOfLimits", "sum", clearanceRef,
                SpecDatasets.KpiToleranceJson(context.Spec), "fail", true,
                "none", null, null, 7, "lowerIsBetter", "", "%", 1,
                thresholdsEnabled: true, warningThreshold: 3, criticalThreshold: 6, groupByColumnRef: lineRef));

        var buildsByInspector = SeedWidgets.Placeholder(tab, WidgetType.Kpi, 36, 14, 12, 9);
        batch.AddChart(buildsByInspector, () =>
            KpiWidgetJson.Config("Builds by inspector", log, "aggregate", "count", null, "null", "fail", true,
                "none", null, null, 7, "higherIsBetter", "", "", 0,
                groupByColumnRef: inspectorRef));
    }
}
