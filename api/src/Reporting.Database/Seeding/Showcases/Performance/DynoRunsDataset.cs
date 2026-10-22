using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>Dyno test runs across eight test cells and four engine types over the last six months, from a fixed seed.</summary>
internal sealed class DynoRunsDataset : ISeedRowSource
{
    public const string DatasetName = "Dyno Test Runs";

    private static readonly (string Name, double Power)[] Engines =
    [
        ("I4 2.0L", 150.0),
        ("I6 3.0L", 230.0),
        ("V8 5.0L", 330.0),
        ("V12 6.5L", 480.0),
    ];

    private static readonly string[] Cells = ["Cell A", "Cell B", "Cell C", "Cell D", "Cell E", "Cell F", "Cell G", "Cell H"];

    private readonly DateTime _end = DateTime.UtcNow.Date;

    public DynoRunsDataset(int rowCount)
    {
        RowCount = rowCount;
        Dataset = SeedDatasets.Create(DatasetName, DatasetSourceIds.Assembly, "{\"source\":\"assembly\",\"typeId\":9121,\"phaseIds\":[2]}");
        Columns =
        [
            SeedDatasets.Column(Dataset, "Run ID", DatasetColumnType.String, 0),
            SeedDatasets.Column(Dataset, "Test Cell", DatasetColumnType.String, 1),
            SeedDatasets.Column(Dataset, "Engine Type", DatasetColumnType.String, 2),
            SeedDatasets.Column(Dataset, "Run Date", DatasetColumnType.DateTime, 3, SeedFormats.ShortDate),
            SeedDatasets.Column(Dataset, "Peak Power", DatasetColumnType.Double, 4, SeedFormats.Unit(1, " kW")),
            SeedDatasets.Column(Dataset, "Fuel Rate", DatasetColumnType.Double, 5, SeedFormats.Unit(1, " kg/h")),
            SeedDatasets.Column(Dataset, "Oil Temp", DatasetColumnType.Double, 6, SeedFormats.Unit(1, " °C")),
            SeedDatasets.Column(Dataset, "Result", DatasetColumnType.String, 7),
        ];
    }

    public Dataset Dataset { get; }

    public IReadOnlyList<DatasetColumn> Columns { get; }

    public int RowCount { get; }

    public IEnumerable<string?[]> Rows()
    {
        var rng = new Random(20261023);
        for (var i = 0; i < RowCount; i++)
        {
            yield return Run(rng, i);
        }
    }

    private string?[] Run(Random rng, int index)
    {
        var engine = Engines[rng.Next(Engines.Length)];
        var cell = rng.Next(Cells.Length);
        var power = engine.Power * (0.95 + rng.NextDouble() * 0.1);
        // Cell F's sensor reads hot, so its runs fail more often.
        var oilTemp = 98.0 + 6.0 * SeedRandom.NextNormal(rng) + (cell == 5 ? 9.0 : 0.0);
        var fuel = power * 0.21 * (0.93 + rng.NextDouble() * 0.14);
        return
        [
            $"TR-{index + 1:000000}",
            Cells[cell],
            engine.Name,
            SeedFormats.Iso(_end.AddDays(-182 + (double)index / RowCount * 182).Date),
            SeedFormats.Num(Math.Round(power, 1)),
            SeedFormats.Num(Math.Round(fuel, 1)),
            SeedFormats.Num(Math.Round(oilTemp, 1)),
            ResultOf(oilTemp, rng),
        ];
    }

    private static string ResultOf(double oilTemp, Random rng)
    {
        if (oilTemp > 118.0)
        {
            return "Fail";
        }

        return oilTemp > 110.0 || rng.NextDouble() < 0.03 ? "Retest" : "Pass";
    }
}
