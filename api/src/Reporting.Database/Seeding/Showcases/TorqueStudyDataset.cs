using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>
/// Each station and shift draws from its own normal distribution, with a few extreme readings for the
/// Tukey whiskers to flag. A fixed RNG seed keeps the data identical across rebuilds.
/// </summary>
internal sealed class TorqueStudyDataset
{
    private const int PerGroup = 14;

    // (station, day mean, day sd); the night shift runs a little higher and wider.
    private static readonly (string Station, double Mean, double Sd)[] Stations =
    [
        ("Station A", 12.00, 0.30),
        ("Station B", 12.55, 0.70),
        ("Station C", 11.55, 0.45),
        ("Station D", 12.10, 1.05),
    ];

    private static readonly string[] Operators = ["J. Reyes", "K. Novak", "P. Osei", "L. Haddad"];

    private readonly SeedBatch _batch;
    private readonly Dataset _dataset;
    private readonly DatasetColumn _sampleId;
    private readonly DatasetColumn _station;
    private readonly DatasetColumn _shift;
    private readonly DatasetColumn _operator;
    private readonly DatasetColumn _torque;
    private readonly DatasetColumn _measuredAt;
    private readonly Random _rng = new(20260902);
    private readonly DateTime _start = new(2026, 5, 4);
    private int _sample = 1;

    private TorqueStudyDataset(SeedBatch batch)
    {
        _batch = batch;
        _dataset = SeedDatasets.Create(TorqueStudyShowcase.Name, DatasetSourceIds.Assembly, "{\"source\":\"assembly\",\"typeId\":7788,\"phaseIds\":[5,6]}");
        _sampleId = SeedDatasets.Column(_dataset, "Sample ID", DatasetColumnType.String, 0);
        _station = SeedDatasets.Column(_dataset, "Station", DatasetColumnType.String, 1);
        _shift = SeedDatasets.Column(_dataset, "Shift", DatasetColumnType.String, 2);
        _operator = SeedDatasets.Column(_dataset, "Operator", DatasetColumnType.String, 3);
        _torque = SeedDatasets.Column(_dataset, "Seal Torque", DatasetColumnType.Double, 4, SeedFormats.Unit(2, " Nm"));
        _measuredAt = SeedDatasets.Column(_dataset, "Measured At", DatasetColumnType.DateTime, 5, SeedFormats.ShortDate);
    }

    public static Dataset Build(SeedBatch batch)
    {
        var builder = new TorqueStudyDataset(batch);
        var day = builder.AddGroups();
        builder.AddOutliers(day);
        return builder._dataset;
    }

    private int AddGroups()
    {
        var day = 0;
        foreach (var (station, mean, sd) in Stations)
        {
            for (var s = 0; s < 2; s++)
            {
                var night = s == 1;
                var shift = night ? "Night" : "Day";
                var groupMean = night ? mean + 0.18 : mean;
                var groupSd = night ? sd * 1.25 : sd;

                for (var i = 0; i < PerGroup; i++)
                {
                    var value = Math.Clamp(groupMean + groupSd * SeedRandom.NextNormal(_rng), 8.0, 17.0);
                    Emit(station, shift, Operators[_sample % Operators.Length], value, day);
                    day++;
                }
            }
        }

        return day;
    }

    private void AddOutliers(int day)
    {
        Emit("Station A", "Day", "J. Reyes", 13.55, day++);
        Emit("Station B", "Night", "K. Novak", 15.90, day++);
        Emit("Station C", "Night", "P. Osei", 9.85, day++);
        Emit("Station D", "Day", "L. Haddad", 8.70, day++);
        Emit("Station D", "Day", "L. Haddad", 15.40, day);
    }

    private void Emit(string station, string shift, string op, double value, int dayOffset)
    {
        SeedDatasets.AddRow(_dataset, _batch, new Dictionary<DatasetColumn, string>
        {
            [_sampleId] = $"TQ-{_sample:0000}",
            [_station] = station,
            [_shift] = shift,
            [_operator] = op,
            [_torque] = SeedFormats.Num(Math.Round(value, 2)),
            [_measuredAt] = SeedFormats.Iso(_start.AddDays(dayOffset)),
        });
        _sample++;
    }
}
