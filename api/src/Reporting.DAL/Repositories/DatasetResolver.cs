using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// The dataset a requested id resolves to: <paramref name="Physical"/> is the dataset whose rows
/// and cells actually exist (what every row/cell query runs against and whose columns are the
/// schema), while <paramref name="Id"/>/<paramref name="Name"/> identify the dataset as requested —
/// the two differ when the request named a filtered dataset. <paramref name="MandatoryFilter"/> is
/// every level of filtering a chain of filtered datasets bakes in, AND-ed together; null means none.
/// </summary>
public sealed record ResolvedDataset(int Id, string Name, Dataset Physical, FilterGroupDto? MandatoryFilter);

/// <summary>
/// Makes a filtered dataset (one sourced from <see cref="DatasetSourceKey.Filtered"/> — a wrapper
/// around a base dataset plus a saved filter, with no rows or columns of its own) transparent to
/// every reader. Resolving walks any chain of filtered-on-filtered datasets to the one whose data is
/// physical, AND-ing each level's saved filter together. Every dataset/widget query should resolve
/// through this instead of loading <see cref="Dataset"/> directly, so a filtered dataset works
/// anywhere a regular one does.
/// </summary>
public class DatasetResolver(ReportingDbContext db)
{
    /// <summary>Generous enough for any real chain; past this it's almost certainly a data bug.</summary>
    private const int MaxChainDepth = 20;

    public async Task<ResolvedDataset?> ResolveAsync(int requestedId)
    {
        var requested = await LoadAsync(requestedId);
        if (requested is null)
        {
            return null;
        }

        var current = requested;
        var filters = new List<FilterGroupDto>();
        var visited = new HashSet<int> { requested.Id };

        for (var depth = 0; current.Source!.Key == DatasetSourceKey.Filtered; depth++)
        {
            if (depth >= MaxChainDepth)
            {
                throw new FilterException("Filtered dataset chain is too deep.");
            }

            var config = (FilteredDatasetSourceConfig)current.GetSourceConfig();
            if (config.Filter is { Children.Count: > 0 } filter)
            {
                filters.Add(filter);
            }

            if (!visited.Add(config.BaseDatasetId))
            {
                throw new FilterException("Circular filtered-dataset reference.");
            }

            current = await LoadAsync(config.BaseDatasetId)
                ?? throw new FilterException("A filtered dataset's base dataset no longer exists.");
        }

        var mandatory = filters.Count == 0
            ? null
            : new FilterGroupDto { Join = FilterJoin.And, Children = filters.Cast<FilterNodeDto>().ToList() };
        return new ResolvedDataset(requested.Id, requested.Name, current, mandatory);
    }

    private Task<Dataset?> LoadAsync(int id) =>
        db.Datasets.AsNoTracking()
            .Include(d => d.Source)
            .Include(d => d.Columns)
            .FirstOrDefaultAsync(d => d.Id == id);

    /// <summary>
    /// Whether pointing <paramref name="datasetId"/> at <paramref name="candidateBaseId"/> would
    /// create a cycle — the candidate is the dataset itself, or (transitively, through its own chain
    /// of filtered bases as currently stored) leads back to it. Used to validate a filtered dataset's
    /// base <em>before</em> saving, since saving first and resolving after would just throw.
    /// </summary>
    public async Task<bool> WouldCreateCycleAsync(int datasetId, int candidateBaseId)
    {
        var visited = new HashSet<int>();
        var currentId = candidateBaseId;
        for (var depth = 0; depth < MaxChainDepth; depth++)
        {
            if (currentId == datasetId)
            {
                return true;
            }

            if (!visited.Add(currentId))
            {
                return true; // the candidate's own chain already cycles
            }

            var current = await LoadAsync(currentId);
            if (current is null || current.Source!.Key != DatasetSourceKey.Filtered)
            {
                return false;
            }

            var config = (FilteredDatasetSourceConfig)current.GetSourceConfig();
            currentId = config.BaseDatasetId;
        }
        return true;
    }
}
