using System.Globalization;
using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>
/// Every widget kind that reduces rows on the server, run over the full sensor readings dataset. They're spread over
/// four tabs because the viewer queries a tab's widgets at once, and several full scans side by side can pass the
/// database's 30-second command timeout on a small server.
/// </summary>
internal static class PerformanceReadingsTab
{
    public static void Add(ReportRevision revision, SeedBatch batch, PerformanceContext context)
    {
        var rows = context.Sizes.SensorReadings.ToString("N0", CultureInfo.InvariantCulture);
        AddKpis(Tab(revision, "Readings overview", 0, 30, $"{rows} sensor readings",
            $"Every widget in the four Readings tabs reads all {rows} rows of Machine Sensor Readings (24 machines, one year). "
            + "Counts, sums and averages run in the database; quartiles, bins, control limits and tolerance checks scan every row "
            + "on the server. Only the results reach the browser."), batch, context);
        AddCharts(Tab(revision, "Readings trends", 1, 21, "Grouped in the database",
            "The bar chart ranks all 24 machines and keeps the top 10; the line averages each day of the year per shift."), batch, context);
        AddBreakdown(Tab(revision, "Readings breakdown", 2, 21, "Pivot and box plot",
            "The pivot reduces a million rows to 72 cells in SQL. The box plot works out quartiles for 24 machines in one pass."), batch, context);
        AddDistributions(Tab(revision, "Readings SPC", 3, 39, "Distribution and control",
            "The histogram bins every reading. The control chart makes one subgroup per day and checks the run rules."), batch, context);
    }

    private static Tab Tab(ReportRevision revision, string name, int order, int rows, string heading, string note)
    {
        var tab = new Tab { RefId = Guid.NewGuid(), Name = name, Order = order, Rows = rows };
        revision.Tabs.Add(tab);
        tab.Widgets.Add(SeedWidgets.Title(heading, 0, 0, 48, 2));
        tab.Widgets.Add(SeedWidgets.Paragraph(note, 0, 2, 48, 3));
        return tab;
    }

    private static void AddKpis(Tab tab, SeedBatch batch, PerformanceContext context)
    {
        var readings = context.Readings;
        var tempRef = context.Reading("Spindle Temp");

        var count = SeedWidgets.Placeholder(tab, WidgetType.Kpi, 0, 5, 12, 9);
        batch.AddChart(count, () =>
            KpiWidgetJson.Config("Readings", readings, "aggregate", "count", null, "null", "fail", true,
                "none", null, null, 7, "higherIsBetter", "", "", 0));

        var avgTemp = SeedWidgets.Placeholder(tab, WidgetType.Kpi, 12, 5, 12, 9);
        batch.AddChart(avgTemp, () =>
            KpiWidgetJson.Config("Avg spindle temp vs last 30 days", readings, "aggregate", "average", tempRef, "null", "fail", true,
                "previousPeriod", null, context.Reading("Recorded At"), 30, "lowerIsBetter", "", " °C", 1,
                showSparkline: true, sparklinePeriods: 12));

        var outOfLimits = SeedWidgets.Placeholder(tab, WidgetType.Kpi, 24, 5, 12, 9);
        batch.AddChart(outOfLimits, () =>
            KpiWidgetJson.Config("Spindle temp out of limits", readings, "toleranceOutOfLimits", "sum", tempRef,
                SpecDatasets.ToleranceJson(context.TempSpec), "fail", true,
                "fixedTarget", 1, null, 7, "lowerIsBetter", "", "%", 2,
                thresholdsEnabled: true, warningThreshold: 1, criticalThreshold: 3));

        var byShift = SeedWidgets.Placeholder(tab, WidgetType.Kpi, 36, 5, 12, 9);
        batch.AddChart(byShift, () =>
            KpiWidgetJson.Config("Avg vibration by shift", readings, "aggregate", "average", context.Reading("Vibration"), "null", "fail", true,
                "none", null, null, 7, "lowerIsBetter", "", " mm/s", 2, groupByColumnRef: context.Reading("Shift")));

        AddTable(tab, batch, context);
    }

    private static void AddCharts(Tab tab, SeedBatch batch, PerformanceContext context)
    {
        var readings = context.Readings;
        var tempRef = context.Reading("Spindle Temp");
        var machineRef = context.Reading("Machine");

        var bar = SeedWidgets.Placeholder(tab, WidgetType.BarChart, 0, 5, 24, 16);
        batch.AddChart(bar, () =>
            ChartWidgetJson.Bar("Hottest 10 machines, rest as Other", readings, machineRef, [tempRef], "average",
                stacked: false, horizontal: true, "Avg spindle temp (°C)",
                sortJson: ChartSortJson.ByColumn(tempRef, "average", descending: true, limit: 10, showOther: true),
                showValueLabels: true));

        var daily = SeedWidgets.Placeholder(tab, WidgetType.LineChart, 24, 5, 24, 16);
        batch.AddChart(daily, () =>
            ChartWidgetJson.Point("lineChart", "Daily average spindle temp by shift",
                ChartBindingJson.Binding(readings.Id, context.Reading("Recorded At"), yRef: tempRef, seriesRef: context.Reading("Shift")),
                ChartBindingJson.Axes(("primary", "Spindle temp (°C)", "left")),
                xAxisLabel: "Day", showPoints: false, aggregate: "average", xGrouping: "day",
                guideLinesJson: GuideLineJson.List(GuideLineJson.Line("y", 80, "Upper limit", "#dc2626"))));
    }

    private static void AddBreakdown(Tab tab, SeedBatch batch, PerformanceContext context)
    {
        var readings = context.Readings;
        var tempRef = context.Reading("Spindle Temp");
        var machineRef = context.Reading("Machine");

        var pivot = SeedWidgets.Placeholder(tab, WidgetType.PivotTable, 0, 5, 24, 16);
        batch.AddChart(pivot, () =>
            PivotWidgetJson.Config("Machines by shift", readings, [machineRef],
            [
                new PivotMeasureSeed(null, "count", "Readings"),
                new PivotMeasureSeed(tempRef, "average", "Avg temp", DataBars: true),
                new PivotMeasureSeed(context.Reading("Vibration"), "max", "Peak vibration", FormatRulesJson: FormatRuleJson.List(
                    FormatRuleJson.Rule("greaterThan", "8", "red"))),
            ],
            columnFieldRefs: [context.Reading("Shift")]));

        var box = SeedWidgets.Placeholder(tab, WidgetType.BoxPlot, 24, 5, 24, 16);
        batch.AddChart(box, () =>
            ChartWidgetJson.BoxPlot("Vibration by machine", readings, context.Reading("Machine"), context.Reading("Vibration"), null,
                "tukey", "Vibration (mm/s)", showMean: true, showSampleSize: true));
    }

    private static void AddDistributions(Tab tab, SeedBatch batch, PerformanceContext context)
    {
        var readings = context.Readings;
        var tempRef = context.Reading("Spindle Temp");

        var histogram = SeedWidgets.Placeholder(tab, WidgetType.Histogram, 0, 5, 48, 14);
        batch.AddChart(histogram, () =>
            ChartWidgetJson.Histogram("Spindle temp distribution", ChartBindingJson.Binding(readings.Id, tempRef),
                "Spindle temp (°C)", "Readings", binMode: "count", binCount: 60, normalize: "count", showLegend: false,
                bandsJson: SpecDatasets.BandJson(context.TempSpec, axis: "x"), showNormalCurve: true));

        var control = SeedWidgets.Placeholder(tab, WidgetType.XBarRChart, 0, 19, 48, 20);
        batch.AddChart(control, () =>
            ChartWidgetJson.XBarR("Daily spindle temp (Xbar-S, one subgroup per day)", readings, context.Reading("Recorded At"), tempRef,
                "Spindle temp (°C)", bandsJson: SpecDatasets.BandJson(context.TempSpec), mode: "xBarS", categoryGrouping: "day",
                runRules: true));
    }

    private static void AddTable(Tab tab, SeedBatch batch, PerformanceContext context)
    {
        var table = SeedWidgets.Placeholder(tab, WidgetType.DataTable, 0, 14, 48, 16);
        batch.AddChart(table, () =>
            TableWidgetJson.Config("Latest readings (sorted, searchable, scroll to load more)", context.Readings,
            [
                new TableColumnSeed("Recorded At"),
                new TableColumnSeed("Machine"),
                new TableColumnSeed("Shift"),
                new TableColumnSeed("Spindle Temp", ToleranceJson: SpecDatasets.ToleranceJson(context.TempSpec)),
                new TableColumnSeed("Vibration"),
                new TableColumnSeed("Within Limits", FormatRulesJson: FormatRuleJson.List(FormatRuleJson.Rule("equals", "false", "red"))),
            ],
            new TableOptionsSeed(ShowSearch: true, SortColumnName: "Recorded At", SortDirection: "desc")));
    }
}
