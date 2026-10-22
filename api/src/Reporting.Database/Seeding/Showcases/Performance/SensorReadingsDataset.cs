using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>
/// Spindle temperature and vibration readings from 24 machines over the last year, evenly spaced in time. Generated
/// from a fixed seed, so every install gets the same values; two machines run hot and one drifts upward.
/// </summary>
internal sealed class SensorReadingsDataset : ISeedRowSource
{
    public const string DatasetName = "Machine Sensor Readings";

    private const int Machines = 24;
    private static readonly TimeSpan Span = TimeSpan.FromDays(365);

    private readonly DateTime _end = DateTime.UtcNow.Date;

    public SensorReadingsDataset(int rowCount)
    {
        RowCount = rowCount;
        Dataset = SeedDatasets.Create(DatasetName, DatasetSourceIds.Assembly, "{\"source\":\"assembly\",\"typeId\":9120,\"phaseIds\":[1]}");
        Columns =
        [
            SeedDatasets.Column(Dataset, "Recorded At", DatasetColumnType.DateTime, 0, "{\"dateFormat\":\"d MMM yyyy HH:mm\"}"),
            SeedDatasets.Column(Dataset, "Machine", DatasetColumnType.String, 1),
            SeedDatasets.Column(Dataset, "Shift", DatasetColumnType.String, 2),
            SeedDatasets.Column(Dataset, "Spindle Temp", DatasetColumnType.Double, 3, SeedFormats.Unit(1, " °C")),
            SeedDatasets.Column(Dataset, "Vibration", DatasetColumnType.Double, 4, SeedFormats.Unit(2, " mm/s")),
            SeedDatasets.Column(Dataset, "Within Limits", DatasetColumnType.Bool, 5, SeedFormats.Labels("Yes", "No")),
        ];
    }

    public Dataset Dataset { get; }

    public IReadOnlyList<DatasetColumn> Columns { get; }

    public int RowCount { get; }

    public IEnumerable<string?[]> Rows()
    {
        var rng = new Random(20261022);
        var start = _end - Span;
        var step = Span.Ticks / Math.Max(RowCount, 1);
        for (var i = 0; i < RowCount; i++)
        {
            yield return Reading(rng, start.AddTicks(step * i), i % Machines, (double)i / RowCount);
        }
    }

    private static string?[] Reading(Random rng, DateTime at, int machine, double yearFraction)
    {
        var temp = Temperature(rng, at, machine, yearFraction);
        var vibration = Math.Round(Math.Exp(0.85 + 0.35 * SeedRandom.NextNormal(rng)) + (machine == 7 ? 0.8 : 0.0), 2);
        return
        [
            SeedFormats.Iso(at),
            $"CNC-{machine + 1:00}",
            ShiftOf(at),
            SeedFormats.Num(temp),
            SeedFormats.Num(vibration),
            SeedFormats.Bool(temp <= 80.0 && vibration <= 4.5),
        ];
    }

    /// <summary>A per-machine base, a daily cycle, Gaussian noise, and an upward drift on machine 18 through the year.</summary>
    private static double Temperature(Random rng, DateTime at, int machine, double yearFraction)
    {
        var baseTemp = 58.0 + machine % 6 * 2.5 + (machine is 3 or 11 ? 7.0 : 0.0);
        var daily = 3.0 * Math.Sin(at.TimeOfDay.TotalHours / 24.0 * 2.0 * Math.PI);
        var drift = machine == 17 ? 12.0 * yearFraction : 0.0;
        return Math.Round(baseTemp + daily + drift + 2.2 * SeedRandom.NextNormal(rng), 1);
    }

    private static string ShiftOf(DateTime at)
    {
        var hour = at.Hour;
        if (hour is >= 6 and < 14)
        {
            return "Day";
        }

        return hour is >= 14 and < 22 ? "Evening" : "Night";
    }
}
