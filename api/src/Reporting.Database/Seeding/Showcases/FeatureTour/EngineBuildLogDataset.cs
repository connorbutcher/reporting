using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>
/// Twelve builds per engine and line, taken in turn so every week mixes engines, plus a few rough R&amp;D-bench
/// prototypes the report filter excludes. Dates end shortly before today so the KPI tab's rolling "last N days"
/// windows always have rows. Values come from a fixed seed, so every install gets the same numbers.
/// </summary>
internal sealed class EngineBuildLogDataset
{
    private const int PerGroup = 12;

    private static readonly EngineProfile[] Engines =
    [
        new("I4 2.0L", 150.0, 280.0, 3600.0, 18.0, 0.045, 0.006),
        new("I6 3.0L", 230.0, 440.0, 5200.0, 24.0, 0.046, 0.007),
        new("V8 5.0L", 330.0, 610.0, 8400.0, 33.0, 0.048, 0.008),
        new("V12 6.5L", 480.0, 810.0, 12000.0, 40.0, 0.044, 0.005),
    ];

    private static readonly EngineProfile BenchPrototype = new("V8 5.0L", 330.0, 610.0, 8400.0, 33.0, 0.050, 0.014);

    private static readonly string[] Lines = ["Line 1", "Line 2"];

    private static readonly string[] Inspectors = ["A. Whitfield", "R. Okafor", "M. Lindqvist", "S. Bhandari"];

    private readonly SeedBatch _batch;
    private readonly Dataset _dataset;
    private readonly DatasetColumn _buildId;
    private readonly DatasetColumn _engine;
    private readonly DatasetColumn _line;
    private readonly DatasetColumn _inspector;
    private readonly DatasetColumn _buildDate;
    private readonly DatasetColumn _power;
    private readonly DatasetColumn _torque;
    private readonly DatasetColumn _clearance;
    private readonly DatasetColumn _cost;
    private readonly DatasetColumn _hours;
    private readonly DatasetColumn _rework;
    private readonly DatasetColumn _passed;
    private readonly EngineBuildFormulaColumns _formulas;
    private readonly Random _rng = new(20260913);
    private readonly DateTime _start = DateTime.UtcNow.Date.AddDays(-105);
    private int _build = 1;
    private int _day;

    private EngineBuildLogDataset(SeedBatch batch)
    {
        _batch = batch;
        _dataset = SeedDatasets.Create("Engine Build Log", DatasetSourceIds.Assembly, "{\"source\":\"assembly\",\"typeId\":4471,\"phaseIds\":[1,2,3,4]}");
        _buildId = SeedDatasets.Column(_dataset, "Build ID", DatasetColumnType.String, 0);
        _engine = SeedDatasets.Column(_dataset, "Engine Type", DatasetColumnType.String, 1);
        _line = SeedDatasets.Column(_dataset, "Assembly Line", DatasetColumnType.String, 2);
        _inspector = SeedDatasets.Column(_dataset, "Inspector", DatasetColumnType.String, 3);
        _buildDate = SeedDatasets.Column(_dataset, "Build Date", DatasetColumnType.DateTime, 4, SeedFormats.ShortDate);
        _power = SeedDatasets.Column(_dataset, "Peak Power", DatasetColumnType.Double, 5, SeedFormats.Unit(1, " kW"));
        _torque = SeedDatasets.Column(_dataset, "Peak Torque", DatasetColumnType.Double, 6, SeedFormats.Unit(1, " Nm"));
        _clearance = SeedDatasets.Column(_dataset, "Main Bearing Clearance", DatasetColumnType.Double, 7, SeedFormats.Mm(4));
        _cost = SeedDatasets.Column(_dataset, "Build Cost", DatasetColumnType.Double, 8, SeedFormats.Gbp);
        _hours = SeedDatasets.Column(_dataset, "Build Hours", DatasetColumnType.Double, 9, SeedFormats.Unit(1, " h"));
        _rework = SeedDatasets.Column(_dataset, "Rework Count", DatasetColumnType.Int, 10);
        _passed = SeedDatasets.Column(_dataset, "Passed", DatasetColumnType.Bool, 11, SeedFormats.Labels("Pass", "Fail"));
        _formulas = new EngineBuildFormulaColumns(_dataset, 12);
    }

    public static Dataset Build(SeedBatch batch)
    {
        var builder = new EngineBuildLogDataset(batch);
        builder.AddLineBuilds();
        builder.AddBenchBuilds();
        return builder._dataset;
    }

    private void AddLineBuilds()
    {
        for (var i = 0; i < PerGroup; i++)
        {
            foreach (var engine in Engines)
            {
                foreach (var line in Lines)
                {
                    Emit(engine, line);
                }
            }
        }
    }

    private void AddBenchBuilds()
    {
        for (var i = 0; i < 4; i++)
        {
            Emit(BenchPrototype, "R&D Bench");
        }
    }

    private void Emit(EngineProfile engine, string line)
    {
        var slow = line == "Line 2";
        var bench = line == "R&D Bench";
        var powerValue = engine.Power * (0.96 + _rng.NextDouble() * 0.08);
        // Torque tracks power at roughly a fixed ratio, with a little independent scatter.
        var torqueValue = powerValue * (engine.Torque / engine.Power) * (0.97 + _rng.NextDouble() * 0.06);
        var clearValue = Math.Round(Math.Clamp(engine.ClearanceMean + engine.ClearanceSd * SeedRandom.NextNormal(_rng), 0.025, 0.072), 4);
        var reworkValue = bench ? _rng.Next(2, 6) : _rng.Next(0, slow ? 5 : 3);
        var inSpec = clearValue is >= 0.030 and <= 0.060;
        var build = new EngineBuildValues(
            engine.Name,
            Math.Round(engine.Cost * (0.94 + _rng.NextDouble() * 0.12), 0),
            Math.Round(engine.Hours * (slow ? 1.08 : 1.0) * (0.92 + _rng.NextDouble() * 0.16), 1),
            _start.AddDays(_day),
            reworkValue,
            inSpec && reworkValue <= 2);

        var values = new Dictionary<DatasetColumn, string>
        {
            [_buildId] = $"EB-{_build:0000}",
            [_engine] = engine.Name,
            [_line] = line,
            [_inspector] = Inspectors[_rng.Next(Inspectors.Length)],
            [_buildDate] = SeedFormats.Iso(build.Date),
            [_power] = SeedFormats.Num(Math.Round(powerValue, 1)),
            [_torque] = SeedFormats.Num(Math.Round(torqueValue, 1)),
            [_clearance] = SeedFormats.Num(clearValue),
            [_cost] = SeedFormats.Num(build.Cost),
            [_hours] = SeedFormats.Num(build.Hours),
            [_rework] = SeedFormats.Int(reworkValue),
            [_passed] = SeedFormats.Bool(build.Passed),
        };
        _formulas.AddValues(values, build);
        SeedDatasets.AddRow(_dataset, _batch, values);
        _build++;
        _day++;
    }
}
