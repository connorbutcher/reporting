namespace Reporting.Database;

internal sealed record PerformanceContext(Dataset Readings, SpecDataset TempSpec, Dataset Runs, PerformanceShowcaseSizes Sizes)
{
    public Guid Reading(string columnName)
    {
        return SeedDatasets.ColumnRef(Readings, columnName);
    }

    public Guid Run(string columnName)
    {
        return SeedDatasets.ColumnRef(Runs, columnName);
    }
}
