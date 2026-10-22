using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

internal static class DatasetGuards
{
    /// <summary>A filtered dataset is a read-only view over its base, so it can't be edited directly.</summary>
    public static void EnsureNotFiltered(Dataset dataset, string message)
    {
        if (dataset.Source?.Key == DatasetSourceKey.Filtered)
        {
            throw new DataValidationException(message);
        }
    }
}
