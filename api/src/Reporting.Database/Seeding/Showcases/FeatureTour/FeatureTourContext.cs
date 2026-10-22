namespace Reporting.Database;

internal sealed record FeatureTourContext(Dataset Log, SpecDataset Spec, Dataset HighRework)
{
    public Guid Ref(string columnName)
    {
        return SeedDatasets.ColumnRef(Log, columnName);
    }
}
