using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// A filtered dataset's base must be another dataset in the same revision that doesn't already depend on it,
/// and its saved filter can't use a tolerance operator, which needs widget-level banding.
/// </summary>
internal sealed class FilteredDatasetValidator(ReportingDbContext db, DatasetResolver resolver)
{
    public async Task ValidateAsync(Dataset dataset, FilteredDatasetSourceConfig config)
    {
        if (config.BaseDatasetId == 0)
        {
            // Not configured yet.
            return;
        }

        if (config.BaseDatasetId == dataset.Id)
        {
            throw new DataValidationException("A filtered dataset can't filter itself.");
        }

        var baseExists = await db.Datasets.AnyAsync(d => d.Id == config.BaseDatasetId && d.ReportRevisionId == dataset.ReportRevisionId);
        if (!baseExists)
        {
            throw new DataValidationException("The base dataset doesn't exist in this report.");
        }

        if (await resolver.WouldCreateCycleAsync(dataset.Id, config.BaseDatasetId))
        {
            throw new DataValidationException("That base dataset already depends on this one.");
        }

        if (config.Filter is not null && ContainsToleranceOperator(config.Filter))
        {
            throw new DataValidationException("A filtered dataset's saved filter can't use a tolerance condition.");
        }
    }

    private static bool ContainsToleranceOperator(FilterNodeDto node)
    {
        return node switch
        {
            FilterGroupDto group => group.Children.Any(ContainsToleranceOperator),
            FilterConditionDto condition => condition.Operator is FilterOperator.InTolerance or FilterOperator.NeedsConcession or FilterOperator.OutOfTolerance,
            _ => false
        };
    }
}
