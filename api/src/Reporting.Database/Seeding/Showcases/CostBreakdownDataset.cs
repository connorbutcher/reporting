using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>Four cost components per build, jittered around each model's base. Fixed RNG seed.</summary>
internal static class CostBreakdownDataset
{
    private const int PerModel = 8;

    // (model, material, machining, labour, QA) base costs in £.
    private static readonly (string Model, double Material, double Machining, double Labour, double Qa)[] Models =
    [
        ("I4 2.0L", 1800.0, 900.0, 620.0, 340.0),
        ("I6 3.0L", 2600.0, 1300.0, 860.0, 450.0),
        ("V8 5.0L", 4200.0, 2100.0, 1400.0, 700.0),
        ("V12 6.5L", 6800.0, 3400.0, 2200.0, 1100.0),
    ];

    private static readonly string[] Lines = ["Line 1", "Line 2"];

    public static Dataset Build(SeedBatch batch)
    {
        var dataset = SeedDatasets.Create(CostBreakdownShowcase.Name, DatasetSourceIds.Assembly, "{\"source\":\"assembly\",\"typeId\":7788,\"phaseIds\":[3,4]}");

        var buildId = SeedDatasets.Column(dataset, "Build ID", DatasetColumnType.String, 0);
        var model = SeedDatasets.Column(dataset, "Engine Model", DatasetColumnType.String, 1);
        var line = SeedDatasets.Column(dataset, "Line", DatasetColumnType.String, 2);
        var material = SeedDatasets.Column(dataset, "Material Cost", DatasetColumnType.Double, 3, SeedFormats.Gbp);
        var machining = SeedDatasets.Column(dataset, "Machining Cost", DatasetColumnType.Double, 4, SeedFormats.Gbp);
        var labour = SeedDatasets.Column(dataset, "Assembly Labour", DatasetColumnType.Double, 5, SeedFormats.Gbp);
        var qa = SeedDatasets.Column(dataset, "QA & Test", DatasetColumnType.Double, 6, SeedFormats.Gbp);

        var rng = new Random(20260903);
        var build = 1;

        foreach (var (modelName, mat, mac, lab, q) in Models)
        {
            for (var i = 0; i < PerModel; i++)
            {
                SeedDatasets.AddRow(dataset, batch, new Dictionary<DatasetColumn, string>
                {
                    [buildId] = $"BC-{build:0000}",
                    [model] = modelName,
                    [line] = Lines[i % Lines.Length],
                    [material] = SeedFormats.Num(Jitter(rng, mat)),
                    [machining] = SeedFormats.Num(Jitter(rng, mac)),
                    [labour] = SeedFormats.Num(Jitter(rng, lab)),
                    [qa] = SeedFormats.Num(Jitter(rng, q)),
                });
                build++;
            }
        }

        return dataset;
    }

    private static double Jitter(Random rng, double baseCost)
    {
        return Math.Round(baseCost * (0.94 + rng.NextDouble() * 0.12), 0);
    }
}
