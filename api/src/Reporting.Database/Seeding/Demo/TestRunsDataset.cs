using Reporting.Abstractions;

namespace Reporting.Database;

internal static class TestRunsDataset
{
    public static Dataset Build(SeedBatch batch)
    {
        var dataset = SeedDatasets.Create("Engine Test Runs", DatasetSourceIds.Disassembly, "{\"source\":\"disassembly\",\"typeId\":5120,\"phaseIds\":[7,8]}");

        var job = SeedDatasets.Column(dataset, "Job Number", DatasetColumnType.String, 0);
        var serial = SeedDatasets.Column(dataset, "Serial Number", DatasetColumnType.String, 1);
        var part = SeedDatasets.Column(dataset, "Part Number", DatasetColumnType.String, 2);
        var runDate = SeedDatasets.Column(dataset, "Run Date", DatasetColumnType.DateTime, 3, SeedFormats.ShortDate);
        var cell = SeedDatasets.Column(dataset, "Test Cell", DatasetColumnType.String, 4);
        var power = SeedDatasets.Column(dataset, "Peak Power", DatasetColumnType.Double, 5, SeedFormats.Unit(1, " kW"));
        var torque = SeedDatasets.Column(dataset, "Peak Torque", DatasetColumnType.Double, 6, SeedFormats.Unit(1, " Nm"));
        var oil = SeedDatasets.Column(dataset, "Max Oil Pressure", DatasetColumnType.Double, 7, SeedFormats.Unit(2, " bar"));
        var coolant = SeedDatasets.Column(dataset, "Peak Coolant Temp", DatasetColumnType.Double, 8, SeedFormats.Unit(1, " \\u00B0C"));
        var duration = SeedDatasets.Column(dataset, "Run Duration", DatasetColumnType.Double, 9, SeedFormats.Unit(2, " h"));
        var passed = SeedDatasets.Column(dataset, "Passed", DatasetColumnType.Bool, 10, SeedFormats.Labels("Pass", "Fail"));

        var rows = new[]
        {
            ("JOB-2026-0141", "ENG-SN-88201", "PN-4471-C", new DateTime(2026, 1, 16), "Cell 2", 331.4, 612.8, 4.85, 96.4, 2.50, true),
            ("JOB-2026-0142", "ENG-SN-88202", "PN-4471-C", new DateTime(2026, 1, 23), "Cell 2", 329.8, 608.1, 4.78, 98.1, 2.50, true),
            ("JOB-2026-0148", "ENG-SN-88213", "PN-4471-D", new DateTime(2026, 2, 6), "Cell 1", 318.2, 588.4, 4.41, 104.7, 1.75, false),
            ("JOB-2026-0155", "ENG-SN-88224", "PN-5120-A", new DateTime(2026, 2, 20), "Cell 3", 224.6, 441.2, 5.12, 92.8, 3.00, true),
            ("JOB-2026-0161", "ENG-SN-88231", "PN-5120-A", new DateTime(2026, 3, 6), "Cell 3", 226.1, 444.9, 5.08, 91.5, 3.00, true),
            ("JOB-2026-0168", "ENG-SN-88240", "PN-5120-B", new DateTime(2026, 3, 21), "Cell 1", 210.9, 418.6, 4.32, 108.3, 1.25, false),
            ("JOB-2026-0173", "ENG-SN-88252", "PN-6644-A", new DateTime(2026, 4, 5), "Cell 4", 486.7, 812.5, 5.44, 94.2, 4.00, true),
            ("JOB-2026-0180", "ENG-SN-88263", "PN-6644-A", new DateTime(2026, 4, 24), "Cell 4", 479.3, 803.7, 5.31, 97.6, 4.00, true),
        };

        foreach (var r in rows)
        {
            SeedDatasets.AddRow(dataset, batch, new Dictionary<DatasetColumn, string>
            {
                [job] = r.Item1,
                [serial] = r.Item2,
                [part] = r.Item3,
                [runDate] = SeedFormats.Iso(r.Item4),
                [cell] = r.Item5,
                [power] = SeedFormats.Num(r.Item6),
                [torque] = SeedFormats.Num(r.Item7),
                [oil] = SeedFormats.Num(r.Item8),
                [coolant] = SeedFormats.Num(r.Item9),
                [duration] = SeedFormats.Num(r.Item10),
                [passed] = SeedFormats.Bool(r.Item11),
            });
        }

        return dataset;
    }
}
