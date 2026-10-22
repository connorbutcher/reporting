using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>
/// Builds, dyno test runs and concessions keyed on Job Number, with one report-level filter narrowing all
/// three to the same builds.
/// </summary>
internal static class CrossReferenceShowcase
{
    public const string Name = "Engine Build Cross-Reference";

    /// <summary>Only Engine Builds carries "Engine Type", so the other two filter on the matching job numbers.</summary>
    private static readonly string[] V8V12JobNumbers =
        ["JOB-2026-0141", "JOB-2026-0142", "JOB-2026-0148", "JOB-2026-0173", "JOB-2026-0180"];

    public static Report Build(SeedBatch batch, int number)
    {
        var now = DateTime.UtcNow;
        var report = new Report { RefId = Guid.NewGuid(), Number = number, Name = Name, CreatedAt = now, UpdatedAt = now };
        var revision = new ReportRevision { RefId = Guid.NewGuid(), Kind = RevisionKind.Draft, CreatedAt = now };

        var builds = EngineBuildsDataset.Build(batch);
        revision.Datasets.Add(builds);
        var testRuns = TestRunsDataset.Build(batch);
        revision.Datasets.Add(testRuns);
        var concessions = EngineConcessionsDataset.Build(batch);
        revision.Datasets.Add(concessions);

        AddFilters(revision, batch, builds, testRuns, concessions);

        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Cross-reference", Order = 0 };
        revision.Tabs.Add(tab);
        AddIntro(tab);
        AddTables(tab, batch, builds, testRuns, concessions);
        AddOverlayChart(tab, batch, builds, testRuns);

        report.Revisions.Add(revision);
        return report;
    }

    private static void AddFilters(ReportRevision revision, SeedBatch batch, Dataset builds, Dataset testRuns, Dataset concessions)
    {
        var engineTypeRef = SeedDatasets.ColumnRef(builds, "Engine Type");
        var runJobRef = SeedDatasets.ColumnRef(testRuns, "Job Number");
        var concessionJobRef = SeedDatasets.ColumnRef(concessions, "Job Number");

        batch.AddFinalizer(() => revision.FiltersJson = FilterJson.ReportFilters(
            (builds.Id, FilterJson.Group("and", FilterJson.Condition(engineTypeRef, "in", "V8 5.0L", "V12 6.5L"))),
            (testRuns.Id, FilterJson.Group("and", FilterJson.Condition(runJobRef, "in", V8V12JobNumbers))),
            (concessions.Id, FilterJson.Group("and", FilterJson.Condition(concessionJobRef, "in", V8V12JobNumbers)))));
    }

    private static void AddIntro(Tab tab)
    {
        tab.Widgets.Add(SeedWidgets.Title(Name, 0, 0, 48, 2));
        tab.Widgets.Add(SeedWidgets.Paragraph(
            "Three datasets keyed on Job Number — builds, dyno test runs, and concessions — each shown in its own table below. One report-level filter narrows all three to the V8 5.0L and V12 6.5L builds at once, dropping the I6 3.0L rows from every table and from the chart's two overlaid series alike.",
            0, 2, 48, 3));
    }

    private static void AddTables(Tab tab, SeedBatch batch, Dataset builds, Dataset testRuns, Dataset concessions)
    {
        var buildsTable = SeedWidgets.Placeholder(tab, WidgetType.DataTable, 0, 5, 48, 9);
        batch.AddTable(buildsTable, builds, "Engine builds",
            ["Job Number", "Serial Number", "Engine Type", "Inspector", "Build Date", "Main Bearing Clearance", "Rework Count"]);

        var runsTable = SeedWidgets.Placeholder(tab, WidgetType.DataTable, 0, 14, 24, 9);
        batch.AddTable(runsTable, testRuns, "Dyno test runs",
            ["Job Number", "Serial Number", "Test Cell", "Run Date", "Peak Power", "Peak Torque", "Passed"]);

        var concessionsTable = SeedWidgets.Placeholder(tab, WidgetType.DataTable, 24, 14, 24, 9);
        batch.AddTable(concessionsTable, concessions, "Concessions",
            ["Job Number", "Serial Number", "Concession Date", "Category", "Raised By", "Cost Impact", "Status"]);
    }

    /// <summary>One chart pulling a series from each of two datasets, each on its own date column and value axis.</summary>
    private static void AddOverlayChart(Tab tab, SeedBatch batch, Dataset builds, Dataset testRuns)
    {
        var buildDateRef = SeedDatasets.ColumnRef(builds, "Build Date");
        var clearanceRef = SeedDatasets.ColumnRef(builds, "Main Bearing Clearance");
        var runDateRef = SeedDatasets.ColumnRef(testRuns, "Run Date");
        var powerRef = SeedDatasets.ColumnRef(testRuns, "Peak Power");

        var overlay = SeedWidgets.Placeholder(tab, WidgetType.LineChart, 0, 23, 48, 12);
        batch.AddChart(overlay, () => ChartWidgetJson.Point("lineChart", "Clearance vs peak power over time",
            string.Join(",",
                ChartBindingJson.Binding(builds.Id, buildDateRef, yRef: clearanceRef,
                    yAxisId: "primary", label: "Bearing clearance", color: "#2f6fed"),
                ChartBindingJson.Binding(testRuns.Id, runDateRef, yRef: powerRef,
                    yAxisId: "power", label: "Peak power", color: "#f97316")),
            ChartBindingJson.Axes(("primary", "Clearance (mm)", "left"), ("power", "Peak power (kW)", "right")),
            xAxisLabel: "Date", smooth: true, showPoints: true));
    }
}
