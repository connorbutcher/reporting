using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>Larger engines cost more and take longer; Line 2 runs slower and reworks more. Fixed RNG seed.</summary>
internal static class ProductionRunsDataset
{
    private const int PerGroup = 8;

    // (model, base cost £, base hours).
    private static readonly (string Model, double Cost, double Hours)[] Models =
    [
        ("I4 2.0L", 3600.0, 18.0),
        ("I6 3.0L", 5200.0, 24.0),
        ("V8 5.0L", 8400.0, 33.0),
    ];

    private static readonly string[] Lines = ["Line 1", "Line 2"];

    public static Dataset Build(SeedBatch batch)
    {
        var dataset = SeedDatasets.Create("Production Runs", DatasetSourceIds.Assembly, "{\"source\":\"assembly\",\"typeId\":7788,\"phaseIds\":[2,3]}");

        var buildId = SeedDatasets.Column(dataset, "Build ID", DatasetColumnType.String, 0);
        var model = SeedDatasets.Column(dataset, "Engine Model", DatasetColumnType.String, 1);
        var line = SeedDatasets.Column(dataset, "Assembly Line", DatasetColumnType.String, 2);
        var cost = SeedDatasets.Column(dataset, "Build Cost", DatasetColumnType.Double, 3, SeedFormats.Gbp);
        var hours = SeedDatasets.Column(dataset, "Build Hours", DatasetColumnType.Double, 4, SeedFormats.Unit(1, " h"));
        var rework = SeedDatasets.Column(dataset, "Rework Count", DatasetColumnType.Int, 5);

        var rng = new Random(20260908);
        var build = 1;

        foreach (var (modelName, baseCost, baseHours) in Models)
        {
            foreach (var lineName in Lines)
            {
                var slow = lineName == "Line 2";
                for (var i = 0; i < PerGroup; i++)
                {
                    var hoursValue = Jitter(rng, baseHours * (slow ? 1.08 : 1.0), 0.10);
                    var reworkValue = rng.Next(0, slow ? 5 : 3);
                    SeedDatasets.AddRow(dataset, batch, new Dictionary<DatasetColumn, string>
                    {
                        [buildId] = $"PR-{build:0000}",
                        [model] = modelName,
                        [line] = lineName,
                        [cost] = SeedFormats.Num(Math.Round(Jitter(rng, baseCost, 0.08), 0)),
                        [hours] = SeedFormats.Num(Math.Round(hoursValue, 1)),
                        [rework] = SeedFormats.Int(reworkValue),
                    });
                    build++;
                }
            }
        }

        return dataset;
    }

    private static double Jitter(Random rng, double baseValue, double spread)
    {
        return baseValue * (1 - spread + rng.NextDouble() * spread * 2);
    }
}
