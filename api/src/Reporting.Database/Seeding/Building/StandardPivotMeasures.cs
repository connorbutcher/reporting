namespace Reporting.Database;

internal static class StandardPivotMeasures
{
    /// <summary>One measure of each aggregate kind over the build cost, hours and rework columns.</summary>
    public static PivotMeasureSeed[] For(Dataset dataset)
    {
        return
        [
            new PivotMeasureSeed(null, "count", "Builds"),
            new PivotMeasureSeed(SeedDatasets.ColumnRef(dataset, "Build Cost"), "sum", "Total cost"),
            new PivotMeasureSeed(SeedDatasets.ColumnRef(dataset, "Build Hours"), "average", "Avg hours"),
            new PivotMeasureSeed(SeedDatasets.ColumnRef(dataset, "Rework Count"), "max", "Worst rework"),
        ];
    }
}
