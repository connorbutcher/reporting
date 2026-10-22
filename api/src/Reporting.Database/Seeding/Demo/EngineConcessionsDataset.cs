using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>One row per rework concession, keyed by the same Job Number as the builds and test runs.</summary>
internal static class EngineConcessionsDataset
{
    public static Dataset Build(SeedBatch batch)
    {
        var dataset = SeedDatasets.Create("Engine Concessions", DatasetSourceIds.Assembly, "{\"source\":\"assembly\",\"typeId\":4471,\"phaseIds\":[10]}");

        var job = SeedDatasets.Column(dataset, "Job Number", DatasetColumnType.String, 0);
        var serial = SeedDatasets.Column(dataset, "Serial Number", DatasetColumnType.String, 1);
        var raisedDate = SeedDatasets.Column(dataset, "Concession Date", DatasetColumnType.DateTime, 2, SeedFormats.ShortDate);
        var category = SeedDatasets.Column(dataset, "Category", DatasetColumnType.String, 3);
        var raisedBy = SeedDatasets.Column(dataset, "Raised By", DatasetColumnType.String, 4);
        var cost = SeedDatasets.Column(dataset, "Cost Impact", DatasetColumnType.Double, 5, SeedFormats.Gbp);
        var status = SeedDatasets.Column(dataset, "Status", DatasetColumnType.Bool, 6, SeedFormats.Labels("Closed", "Open"));

        var rows = new[]
        {
            ("JOB-2026-0142", "ENG-SN-88202", new DateTime(2026, 1, 25), "Main bearing rework", "A. Whitfield", 380.0, true),
            ("JOB-2026-0148", "ENG-SN-88213", new DateTime(2026, 2, 6), "Piston clearance rework", "R. Okafor", 610.0, false),
            ("JOB-2026-0168", "ENG-SN-88240", new DateTime(2026, 3, 24), "Big end rework", "M. Lindqvist", 540.0, true),
            ("JOB-2026-0173", "ENG-SN-88252", new DateTime(2026, 4, 6), "Deck height rework", "S. Bhandari", 720.0, false),
            ("JOB-2026-0180", "ENG-SN-88263", new DateTime(2026, 4, 27), "Main bearing rework", "S. Bhandari", 690.0, true),
        };

        foreach (var r in rows)
        {
            SeedDatasets.AddRow(dataset, batch, new Dictionary<DatasetColumn, string>
            {
                [job] = r.Item1,
                [serial] = r.Item2,
                [raisedDate] = SeedFormats.Iso(r.Item3),
                [category] = r.Item4,
                [raisedBy] = r.Item5,
                [cost] = SeedFormats.Num(r.Item6),
                [status] = SeedFormats.Bool(r.Item7),
            });
        }

        return dataset;
    }
}
