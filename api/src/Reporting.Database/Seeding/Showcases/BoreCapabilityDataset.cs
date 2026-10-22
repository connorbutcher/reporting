using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>One machine centred, one high and wide, one low, so the pooled tails cross both limits. Fixed RNG seed.</summary>
internal static class BoreCapabilityDataset
{
    private const int PerMachine = 44;

    // (machine, mean, sd) against a nominal 101.60 mm ±0.05.
    private static readonly (string Machine, double Mean, double Sd)[] Machines =
    [
        ("CNC-01", 101.601, 0.011),
        ("CNC-02", 101.618, 0.016),
        ("CNC-03", 101.589, 0.013),
    ];

    public static Dataset Build(SeedBatch batch)
    {
        var dataset = SeedDatasets.Create(BoreCapabilityShowcase.Name, DatasetSourceIds.Assembly, "{\"source\":\"assembly\",\"typeId\":7788,\"phaseIds\":[7,8]}");

        var sampleId = SeedDatasets.Column(dataset, "Sample ID", DatasetColumnType.String, 0);
        var machine = SeedDatasets.Column(dataset, "Machine", DatasetColumnType.String, 1);
        var bore = SeedDatasets.Column(dataset, "Bore Diameter", DatasetColumnType.Double, 2, SeedFormats.Mm(3));
        var measuredAt = SeedDatasets.Column(dataset, "Measured At", DatasetColumnType.DateTime, 3, SeedFormats.ShortDate);

        var rng = new Random(20260907);
        var start = new DateTime(2026, 6, 1);
        var sample = 1;
        var day = 0;

        foreach (var (machineName, mean, sd) in Machines)
        {
            for (var i = 0; i < PerMachine; i++)
            {
                var value = Math.Clamp(mean + sd * SeedRandom.NextNormal(rng), 101.53, 101.67);
                SeedDatasets.AddRow(dataset, batch, new Dictionary<DatasetColumn, string>
                {
                    [sampleId] = $"BD-{sample:0000}",
                    [machine] = machineName,
                    [bore] = SeedFormats.Num(Math.Round(value, 3)),
                    [measuredAt] = SeedFormats.Iso(start.AddDays(day)),
                });
                sample++;
                day++;
            }
        }

        return dataset;
    }
}
