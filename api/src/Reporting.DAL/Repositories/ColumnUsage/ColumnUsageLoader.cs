using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// A dataset belongs to one revision, so only that revision's widgets, page filters and filtered datasets can
/// refer to its columns.
/// </summary>
internal sealed class ColumnUsageLoader(ReportingDbContext db)
{
    public async Task<ColumnUsageSource?> LoadAsync(int datasetId)
    {
        var dataset = await db.Datasets.AsNoTracking()
            .Where(d => d.Id == datasetId)
            .Select(d => new { d.Id, d.ReportRevisionId, Columns = d.Columns.Select(c => new { c.RefId, c.Type }).ToList() })
            .FirstOrDefaultAsync();
        if (dataset is null)
        {
            return null;
        }

        var widgets = await db.Widgets.AsNoTracking()
            .Where(w => w.Tab!.ReportRevisionId == dataset.ReportRevisionId)
            .OrderBy(w => w.Tab!.Order).ThenBy(w => w.Y).ThenBy(w => w.X)
            .Select(w => new ScanWidget(w.RefId, w.Type, w.ConfigJson, w.Tab!.Name))
            .ToListAsync();

        var filtersJson = await db.ReportRevisions.AsNoTracking()
            .Where(r => r.Id == dataset.ReportRevisionId)
            .Select(r => r.FiltersJson)
            .FirstOrDefaultAsync();

        return new ColumnUsageSource(
            dataset.Columns.ToDictionary(c => c.RefId, c => c.Type),
            widgets,
            ReportFilterJson.For(filtersJson, datasetId).ToList(),
            await FilteredDatasetsOnAsync(datasetId, dataset.ReportRevisionId));
    }

    /// <summary>Siblings filtered directly on this dataset, whose saved filters reference its columns.</summary>
    private async Task<List<ScanFilteredDataset>> FilteredDatasetsOnAsync(int datasetId, int revisionId)
    {
        var siblings = await db.Datasets.AsNoTracking()
            .Include(d => d.Source)
            .Where(d => d.ReportRevisionId == revisionId
                && d.DatasetSourceId == DatasetSourceIds.Filtered
                && d.Id != datasetId)
            .ToListAsync();
        return siblings
            .Select(d => (d.Name, Config: d.GetSourceConfig() as FilteredDatasetSourceConfig))
            .Where(d => d.Config?.BaseDatasetId == datasetId)
            .Select(d => new ScanFilteredDataset(d.Name, JsonSerializer.Serialize(d.Config!.Filter)))
            .ToList();
    }
}
