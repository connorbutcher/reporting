using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>
/// The build log's computed columns, one per formula family. The seed writes the values each formula produces,
/// as the app would after a recalculation; a test recalculates them to keep the two in step.
/// </summary>
internal sealed class EngineBuildFormulaColumns
{
    public const string FamilyExpression = "TEXTBEFORE([Engine Type], \" \")";
    public const string CostPerHourExpression = "ROUND([Build Cost] / [Build Hours], 2)";
    public const string BuildWeekExpression = "STARTOFWEEK([Build Date])";
    public const string NeedsReviewExpression = "OR([Rework Count] > 2, NOT([Passed]))";

    private readonly DatasetColumn _family;
    private readonly DatasetColumn _costPerHour;
    private readonly DatasetColumn _buildWeek;
    private readonly DatasetColumn _needsReview;

    public EngineBuildFormulaColumns(Dataset dataset, int firstOrder)
    {
        _family = SeedDatasets.FormulaColumn(dataset, "Engine Family", DatasetColumnType.String, firstOrder, FamilyExpression);
        _costPerHour = SeedDatasets.FormulaColumn(dataset, "Cost per Hour", DatasetColumnType.Double, firstOrder + 1,
            CostPerHourExpression, SeedFormats.Pounds(2));
        _buildWeek = SeedDatasets.FormulaColumn(dataset, "Build Week", DatasetColumnType.DateTime, firstOrder + 2,
            BuildWeekExpression, SeedFormats.ShortDate);
        _needsReview = SeedDatasets.FormulaColumn(dataset, "Needs Review", DatasetColumnType.Bool, firstOrder + 3,
            NeedsReviewExpression, SeedFormats.Labels("Review", "OK"));
    }

    public void AddValues(Dictionary<DatasetColumn, string> values, EngineBuildValues build)
    {
        values[_family] = build.Engine.Split(' ')[0];
        values[_costPerHour] = SeedFormats.Num(Math.Round(build.Cost / build.Hours, 2, MidpointRounding.AwayFromZero));
        values[_buildWeek] = SeedFormats.Day(StartOfWeek(build.Date));
        values[_needsReview] = SeedFormats.Bool(build.Rework > 2 || !build.Passed);
    }

    private static DateTime StartOfWeek(DateTime date)
    {
        var daysSinceMonday = ((int)date.DayOfWeek + 6) % 7;
        return date.Date.AddDays(-daysSinceMonday);
    }
}
