using Reporting.Abstractions;

namespace Reporting.Database;

internal static class EngineBuildsDataset
{
    public static Dataset Build(SeedBatch batch)
    {
        var dataset = SeedDatasets.Create("Engine Builds", DatasetSourceIds.Assembly, "{\"source\":\"assembly\",\"typeId\":4471,\"phaseIds\":[1,2,3]}");

        var job = SeedDatasets.Column(dataset, "Job Number", DatasetColumnType.String, 0);
        var serial = SeedDatasets.Column(dataset, "Serial Number", DatasetColumnType.String, 1);
        var part = SeedDatasets.Column(dataset, "Part Number", DatasetColumnType.String, 2);
        var engineType = SeedDatasets.Column(dataset, "Engine Type", DatasetColumnType.String, 3);
        var buildDate = SeedDatasets.Column(dataset, "Build Date", DatasetColumnType.DateTime, 4, SeedFormats.ShortDate);
        var inspector = SeedDatasets.Column(dataset, "Inspector", DatasetColumnType.String, 5);
        var bore = SeedDatasets.Column(dataset, "Bore Diameter", DatasetColumnType.Double, 6, SeedFormats.Mm(3));
        var mainBearing = SeedDatasets.Column(dataset, "Main Bearing Clearance", DatasetColumnType.Double, 7, SeedFormats.Mm(4));
        var bigEnd = SeedDatasets.Column(dataset, "Big End Clearance", DatasetColumnType.Double, 8, SeedFormats.Mm(4));
        var pistonBore = SeedDatasets.Column(dataset, "Piston to Bore Clearance", DatasetColumnType.Double, 9, SeedFormats.Mm(4));
        var endFloat = SeedDatasets.Column(dataset, "Crankshaft End Float", DatasetColumnType.Double, 10, SeedFormats.Mm(3));
        var deckHeight = SeedDatasets.Column(dataset, "Deck Height", DatasetColumnType.Double, 11, SeedFormats.Mm(3));
        var compression = SeedDatasets.Column(dataset, "Compression Ratio", DatasetColumnType.Double, 12, "{\"decimals\":2,\"suffix\":\":1\"}");
        var rework = SeedDatasets.Column(dataset, "Rework Count", DatasetColumnType.Int, 13);
        var concessions = SeedDatasets.Column(dataset, "Build Concessions Signed Off", DatasetColumnType.Bool, 14,
            SeedFormats.Labels("Signed off", "Outstanding"));

        var rows = new[]
        {
            ("JOB-2026-0141", "ENG-SN-88201", "PN-4471-C", "V8 5.0L", new DateTime(2026, 1, 14), "A. Whitfield",
                101.600, 0.0432, 0.0381, 0.0620, 0.152, 231.775, 10.50, 0, true),
            ("JOB-2026-0142", "ENG-SN-88202", "PN-4471-C", "V8 5.0L", new DateTime(2026, 1, 21), "A. Whitfield",
                101.604, 0.0458, 0.0399, 0.0655, 0.164, 231.782, 10.48, 1, true),
            ("JOB-2026-0148", "ENG-SN-88213", "PN-4471-D", "V8 5.0L", new DateTime(2026, 2, 3), "R. Okafor",
                101.612, 0.0511, 0.0442, 0.0701, 0.181, 231.790, 10.42, 2, false),
            ("JOB-2026-0155", "ENG-SN-88224", "PN-5120-A", "I6 3.0L", new DateTime(2026, 2, 18), "R. Okafor",
                84.010, 0.0389, 0.0350, 0.0548, 0.139, 208.450, 11.20, 0, true),
            ("JOB-2026-0161", "ENG-SN-88231", "PN-5120-A", "I6 3.0L", new DateTime(2026, 3, 4), "M. Lindqvist",
                84.014, 0.0402, 0.0361, 0.0572, 0.147, 208.461, 11.18, 0, true),
            ("JOB-2026-0168", "ENG-SN-88240", "PN-5120-B", "I6 3.0L", new DateTime(2026, 3, 19), "M. Lindqvist",
                84.021, 0.0470, 0.0418, 0.0688, 0.176, 208.474, 11.05, 3, false),
            ("JOB-2026-0173", "ENG-SN-88252", "PN-6644-A", "V12 6.5L", new DateTime(2026, 4, 2), "S. Bhandari",
                94.505, 0.0421, 0.0374, 0.0601, 0.158, 254.120, 12.60, 1, true),
            ("JOB-2026-0180", "ENG-SN-88263", "PN-6644-A", "V12 6.5L", new DateTime(2026, 4, 22), "S. Bhandari",
                94.512, 0.0495, 0.0430, 0.0672, 0.169, 254.133, 12.55, 2, false),
        };

        foreach (var r in rows)
        {
            SeedDatasets.AddRow(dataset, batch, new Dictionary<DatasetColumn, string>
            {
                [job] = r.Item1,
                [serial] = r.Item2,
                [part] = r.Item3,
                [engineType] = r.Item4,
                [buildDate] = SeedFormats.Iso(r.Item5),
                [inspector] = r.Item6,
                [bore] = SeedFormats.Num(r.Item7),
                [mainBearing] = SeedFormats.Num(r.Item8),
                [bigEnd] = SeedFormats.Num(r.Item9),
                [pistonBore] = SeedFormats.Num(r.Item10),
                [endFloat] = SeedFormats.Num(r.Item11),
                [deckHeight] = SeedFormats.Num(r.Item12),
                [compression] = SeedFormats.Num(r.Item13),
                [rework] = SeedFormats.Int(r.Item14),
                [concessions] = SeedFormats.Bool(r.Item15),
            });
        }

        return dataset;
    }
}
