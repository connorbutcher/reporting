using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>The reports matching a search, each paired with its "Home / …" folder path, before visibility filtering.</summary>
public sealed record ReportSearchResults(List<Report> Matches, IReadOnlyDictionary<int, string> PathByReportId);

/// <summary>
/// All querying and persistence for reports, their published versions, and the checked-out draft.
/// Pure data access: it makes no authorization decisions — the controller authorizes each action
/// (via an <c>[AuthorizeReport]</c> attribute or the <see cref="Permissions.ResourceAuthorizer"/>)
/// and filters listings to what the caller may see before projecting. Read methods hand back the
/// loaded entities; the caller stamps each with the effective level and favourite state.
/// </summary>
public class ReportRepository(ReportingDbContext db, ICurrentUserAccessor currentUser)
{
    /// <summary>Reports directly inside <paramref name="folderId"/> (root if null), name-ordered, with revisions loaded — unfiltered.</summary>
    public async Task<List<Report>> GetInFolderAsync(int? folderId)
    {
        if (folderId is { } fid && !await db.Folders.AnyAsync(f => f.Id == fid)) return [];

        return await db.Reports
            .Include(r => r.Revisions)
            .Where(r => r.FolderId == folderId)
            .OrderBy(r => r.Name)
            .ToListAsync();
    }

    /// <summary>Every report across every folder, flat — for a whole-tree picker like the "copy from" report select. Unfiltered.</summary>
    public async Task<List<Report>> GetAllAsync() =>
        await db.Reports.Include(r => r.Revisions).OrderBy(r => r.Name).ToListAsync();

    /// <summary>The report ids the current user has starred, for stamping <c>IsFavorite</c> onto summaries.</summary>
    public async Task<HashSet<int>> FavoriteReportIdsAsync()
    {
        var userId = (await currentUser.GetAsync()).Id;
        var ids = await db.ReportFavorites.Where(f => f.UserId == userId).Select(f => f.ReportId).ToListAsync();
        return ids.ToHashSet();
    }

    /// <summary>Finds reports anywhere in the tree by name (contains) or exact report number (accepts "42" or "R-42"). Unfiltered.</summary>
    public async Task<ReportSearchResults> SearchAsync(string? query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return new ReportSearchResults([], new Dictionary<int, string>());

        var trimmed = query.Trim();
        var numericPart = trimmed.StartsWith("R-", StringComparison.OrdinalIgnoreCase) ? trimmed[2..] : trimmed;
        var hasNumberMatch = int.TryParse(numericPart, out var numberQuery);

        var nameMatches = await db.Reports
            .Include(r => r.Revisions)
            .Where(r => EF.Functions.Like(r.Name, $"%{trimmed}%"))
            .ToListAsync();

        var numberMatches = hasNumberMatch
            ? await db.Reports.Include(r => r.Revisions).Where(r => r.Number == numberQuery).ToListAsync()
            : new List<Report>();

        var matches = nameMatches.Concat(numberMatches)
            .GroupBy(r => r.Id)
            .Select(g => g.First())
            .OrderBy(r => r.Name)
            .Take(100)
            .ToList();

        // Walked once in memory rather than per-result, since the whole tree is small
        // enough to hold at once and this avoids N ancestor-chain round trips.
        var allFolders = await db.Folders.ToListAsync();
        var foldersById = allFolders.ToDictionary(f => f.Id);

        string PathFor(int? folderId)
        {
            var segments = new List<string>();
            var current = folderId;
            while (current is { } id && foldersById.TryGetValue(id, out var folder))
            {
                segments.Insert(0, folder.Name);
                current = folder.ParentFolderId;
            }
            return segments.Count == 0 ? "Home" : "Home / " + string.Join(" / ", segments);
        }

        var paths = matches.ToDictionary(r => r.Id, r => PathFor(r.FolderId));
        return new ReportSearchResults(matches, paths);
    }

    /// <summary>Loads a report (with its revisions) by id, or null if it doesn't exist. Visibility is the caller's to enforce.</summary>
    public Task<Report?> GetEntityAsync(int id) =>
        db.Reports.Include(r => r.Revisions).FirstOrDefaultAsync(r => r.Id == id);

    /// <summary>
    /// Creates a report (optionally duplicating <paramref name="sourceReportId"/>'s latest content) and
    /// returns the new entity. The caller authorizes the create and the source's visibility first;
    /// this throws <see cref="DataValidationException"/> only if the folder or source report doesn't exist.
    /// </summary>
    public async Task<Report> CreateAsync(string name, int? folderId, int? sourceReportId = null)
    {
        Folder? folder = null;
        if (folderId is { } fid)
        {
            folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == fid)
                ?? throw new DataValidationException("Folder does not exist.");
        }

        ReportRevision? source = null;
        if (sourceReportId is { } sid)
        {
            var sourceReport = await db.Reports.FirstOrDefaultAsync(r => r.Id == sid)
                ?? throw new DataValidationException("Source report does not exist.");

            source = await IncludeContent(db.ReportRevisions)
                .Where(rv => rv.ReportId == sourceReport.Id && rv.Kind == RevisionKind.Published)
                .OrderByDescending(rv => rv.VersionNumber)
                .FirstOrDefaultAsync()
                ?? await IncludeContent(db.ReportRevisions)
                    .FirstOrDefaultAsync(rv => rv.ReportId == sourceReport.Id && rv.Kind == RevisionKind.Draft);
        }

        var nextNumber = (await db.Reports.MaxAsync(r => (int?)r.Number) ?? 0) + 1;
        var now = DateTime.UtcNow;
        var report = new Report
        {
            RefId = Guid.NewGuid(),
            Number = nextNumber,
            Name = name,
            Folder = folder,
            CreatedAt = now,
            UpdatedAt = now,
        };
        var draft = new ReportRevision
        {
            RefId = Guid.NewGuid(),
            Kind = RevisionKind.Draft,
            CreatedAt = now,
        };
        report.Revisions.Add(draft);
        db.Reports.Add(report);

        // Saves the report and deep-copies any source content (widgets + datasets) into the draft.
        await CopyContentIntoAsync(draft, source);
        return report;
    }

    /// <summary>
    /// Renames/moves a report. The caller authorizes it (Manager on the report, Editor on the
    /// destination when moved) first; returns the updated entity, or throws
    /// <see cref="DataValidationException"/> if the destination folder doesn't exist. The
    /// <paramref name="destinationFolderId"/> is resolved to a real folder here so the move validates.
    /// </summary>
    public async Task<Report?> UpdateAsync(int id, string name, int? destinationFolderId)
    {
        var report = await db.Reports
            .Include(r => r.Revisions)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return null;

        Folder? folder = null;
        if (destinationFolderId is { } fid)
        {
            folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == fid)
                ?? throw new DataValidationException("Folder does not exist.");
        }

        report.Name = name;
        report.FolderId = folder?.Id;
        report.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return report;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return false;

        db.Reports.Remove(report);
        await db.SaveChangesAsync();
        return true;
    }

    // --- version history --------------------------------------------------

    public async Task<List<ReportVersionSummaryDto>?> GetVersionsAsync(int id)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return null;

        var versions = await db.ReportRevisions
            .Where(rv => rv.ReportId == report.Id && rv.Kind == RevisionKind.Published)
            .OrderByDescending(rv => rv.VersionNumber)
            .ToListAsync();

        return versions.Select(v => v.ToVersionSummaryDto()).ToList();
    }

    public async Task<ReportRevisionDto?> GetVersionAsync(int id, int versionNumber)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return null;

        var revision = await db.ReportRevisions
            .Include(rv => rv.Tabs).ThenInclude(t => t.Widgets)
            .FirstOrDefaultAsync(rv => rv.ReportId == report.Id && rv.Kind == RevisionKind.Published && rv.VersionNumber == versionNumber);
        return revision?.ToContentDto(report);
    }

    // --- draft (checkout / autosave / publish) -----------------------------

    public async Task<ReportRevisionDto?> GetDraftAsync(int id)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return null;

        var draft = await db.ReportRevisions
            .Include(rv => rv.Tabs).ThenInclude(t => t.Widgets)
            .FirstOrDefaultAsync(rv => rv.ReportId == report.Id && rv.Kind == RevisionKind.Draft);
        return draft?.ToContentDto(report);
    }

    /// <summary>
    /// Checks out a draft to edit. Idempotent: an existing draft is returned as-is.
    /// Null if the report doesn't exist. Throws <see cref="DataNotFoundException"/>
    /// if a specific source version was requested and doesn't exist.
    /// </summary>
    public async Task<ReportRevisionDto?> CheckoutAsync(int id, int? fromVersionNumber)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return null;

        var existingDraft = await db.ReportRevisions
            .Include(rv => rv.Tabs).ThenInclude(t => t.Widgets)
            .FirstOrDefaultAsync(rv => rv.ReportId == report.Id && rv.Kind == RevisionKind.Draft);
        if (existingDraft is not null) return existingDraft.ToContentDto(report);

        ReportRevision? source = fromVersionNumber is { } versionNumber
            ? await IncludeContent(db.ReportRevisions)
                .FirstOrDefaultAsync(rv => rv.ReportId == report.Id && rv.Kind == RevisionKind.Published && rv.VersionNumber == versionNumber)
            : await IncludeContent(db.ReportRevisions)
                .Where(rv => rv.ReportId == report.Id && rv.Kind == RevisionKind.Published)
                .OrderByDescending(rv => rv.VersionNumber)
                .FirstOrDefaultAsync();

        if (fromVersionNumber is not null && source is null) throw new DataNotFoundException("Version not found.");

        var draft = new ReportRevision
        {
            RefId = Guid.NewGuid(),
            ReportId = report.Id,
            Kind = RevisionKind.Draft,
            CreatedAt = DateTime.UtcNow,
        };
        report.UpdatedAt = DateTime.UtcNow;
        db.ReportRevisions.Add(draft);
        await CopyContentIntoAsync(draft, source);
        return draft.ToContentDto(report);
    }

    /// <summary>Loads the parts of a revision needed to deep-copy it: its widgets and its datasets' full graph.</summary>
    private static IQueryable<ReportRevision> IncludeContent(IQueryable<ReportRevision> revisions) =>
        revisions
            .Include(rv => rv.Tabs).ThenInclude(t => t.Widgets)
            .Include(rv => rv.Datasets).ThenInclude(d => d.Columns)
            .Include(rv => rv.Datasets).ThenInclude(d => d.Rows).ThenInclude(r => r.Cells);

    /// <summary>
    /// Copies grid, filters, widgets and datasets from <paramref name="source"/> into a freshly-added
    /// <paramref name="target"/> revision, saving as it goes. Widget and dataset column/row
    /// <c>RefId</c>s are carried over unchanged so they keep their logical identity across versions;
    /// only their int primary keys change. Because a widget references its dataset by that primary
    /// key, the copied datasets' new keys are remapped into the copied widget configs and report
    /// filters. <paramref name="target"/> (and its parent) must already be tracked/added on the context.
    /// Leaves defaults in place when <paramref name="source"/> is null.
    /// </summary>
    private async Task CopyContentIntoAsync(ReportRevision target, ReportRevision? source)
    {
        target.FiltersJson = source?.FiltersJson ?? "[]";

        // Copy each tab (grid dimensions included) and its widgets, preserving both the tab's and
        // the widgets' RefIds so they keep their logical identity across versions. Widget configs
        // still reference the source's dataset primary keys here; they're remapped once the copied
        // datasets have been saved and their new keys are known. A revision with no source starts
        // with a single empty tab so the editor always has a surface.
        if (source is not null)
        {
            foreach (var sourceTab in source.Tabs)
            {
                var tabCopy = new Tab
                {
                    RefId = sourceTab.RefId,
                    Name = sourceTab.Name,
                    Order = sourceTab.Order,
                    Columns = sourceTab.Columns,
                    Rows = sourceTab.Rows,
                };
                foreach (var widget in sourceTab.Widgets)
                {
                    tabCopy.Widgets.Add(new Widget
                    {
                        RefId = widget.RefId,
                        Type = widget.Type,
                        X = widget.X,
                        Y = widget.Y,
                        W = widget.W,
                        H = widget.H,
                        ConfigJson = widget.ConfigJson,
                    });
                }
                target.Tabs.Add(tabCopy);
            }
        }
        else
        {
            target.Tabs.Add(new Tab { RefId = Guid.NewGuid(), Name = "Tab 1", Order = 0 });
        }

        // Copy each dataset's shell (columns + rows, preserving their RefIds). Cells reference their
        // column by int id, which isn't known until the columns are saved, so they're deferred to a
        // second phase — the same two-step the seeder uses.
        var datasetCopies = new List<DatasetCopy>();
        if (source is not null)
        {
            foreach (var sourceDataset in source.Datasets)
            {
                var copy = new Dataset
                {
                    Name = sourceDataset.Name,
                    DatasetSourceId = sourceDataset.DatasetSourceId,
                    SourceConfigJson = sourceDataset.SourceConfigJson,
                };

                var columnPairs = new List<(DatasetColumn Source, DatasetColumn Copy)>();
                foreach (var column in sourceDataset.Columns)
                {
                    var columnCopy = new DatasetColumn
                    {
                        RefId = column.RefId,
                        Name = column.Name,
                        Type = column.Type,
                        Order = column.Order,
                        ConfigurationJson = column.ConfigurationJson,
                    };
                    copy.Columns.Add(columnCopy);
                    columnPairs.Add((column, columnCopy));
                }

                var rowPairs = new List<(DatasetRow Source, DatasetRow Copy)>();
                foreach (var row in sourceDataset.Rows)
                {
                    var rowCopy = new DatasetRow { RefId = row.RefId };
                    copy.Rows.Add(rowCopy);
                    rowPairs.Add((row, rowCopy));
                }

                target.Datasets.Add(copy);
                datasetCopies.Add(new DatasetCopy(sourceDataset, copy, columnPairs, rowPairs));
            }
        }

        // First save: assigns primary keys to the revision, its widgets, datasets, columns and rows.
        await db.SaveChangesAsync();

        if (source is null || datasetCopies.Count == 0) return;

        // Second phase: copy cells against the new column ids, and remap the dataset primary keys.
        foreach (var dataset in datasetCopies)
        {
            var columnIdMap = dataset.ColumnPairs.ToDictionary(p => p.Source.Id, p => p.Copy.Id);
            foreach (var (sourceRow, rowCopy) in dataset.RowPairs)
            {
                foreach (var cell in sourceRow.Cells)
                {
                    if (!columnIdMap.TryGetValue(cell.ColumnId, out var newColumnId)) continue;
                    db.DatasetCells.Add(new DatasetCell
                    {
                        RowId = rowCopy.Id,
                        ColumnId = newColumnId,
                        StringValue = cell.StringValue,
                        NumberValue = cell.NumberValue,
                        BoolValue = cell.BoolValue,
                        DateValue = cell.DateValue,
                    });
                }
            }
        }

        var datasetIdMap = datasetCopies.ToDictionary(d => d.Source.Id, d => d.Copy.Id);
        foreach (var widget in target.Tabs.SelectMany(t => t.Widgets))
            widget.ConfigJson = Mapping.RemapConfigDatasetIds(widget.ConfigJson, datasetIdMap);

        var filters = target.GetFilters();
        var filtersChanged = false;
        foreach (var filter in filters)
            if (datasetIdMap.TryGetValue(filter.DatasetId, out var mapped)) { filter.DatasetId = mapped; filtersChanged = true; }
        if (filtersChanged) target.SetFilters(filters);

        await db.SaveChangesAsync();
    }

    /// <summary>Correlates a source dataset with its freshly-added copy so cells and dataset ids can be remapped after the first save.</summary>
    private sealed record DatasetCopy(
        Dataset Source,
        Dataset Copy,
        List<(DatasetColumn Source, DatasetColumn Copy)> ColumnPairs,
        List<(DatasetRow Source, DatasetRow Copy)> RowPairs);

    /// <summary>Null if the report doesn't exist. Throws <see cref="DataNotFoundException"/> if no draft is checked out.</summary>
    public async Task<ReportRevisionDto?> UpdateDraftAsync(int id, ReportRevisionDto dto)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return null;

        var draft = await db.ReportRevisions
            .Include(rv => rv.Tabs).ThenInclude(t => t.Widgets)
            .FirstOrDefaultAsync(rv => rv.ReportId == report.Id && rv.Kind == RevisionKind.Draft);
        if (draft is null) throw new DataNotFoundException("No draft is checked out.");

        draft.SetFilters(dto.Filters);

        // Tabs and widgets are addressed by their client-generated RefIds, which are stable across
        // versions. Drop tabs no longer present, then upsert each incoming tab and diff its widgets.
        var incomingTabRefs = dto.Tabs.Select(t => t.Id).ToHashSet();
        draft.Tabs.RemoveAll(t => !incomingTabRefs.Contains(t.RefId));

        foreach (var tabDto in dto.Tabs)
        {
            var tab = draft.Tabs.FirstOrDefault(t => t.RefId == tabDto.Id);
            if (tab is null)
            {
                tab = new Tab();
                tabDto.ApplyTo(tab);
                draft.Tabs.Add(tab);
            }
            else
            {
                tabDto.ApplyTo(tab);
            }

            var incomingWidgetRefs = tabDto.Widgets.Select(w => w.Id).ToHashSet();
            tab.Widgets.RemoveAll(w => !incomingWidgetRefs.Contains(w.RefId));

            foreach (var widgetDto in tabDto.Widgets)
            {
                var widget = tab.Widgets.FirstOrDefault(w => w.RefId == widgetDto.Id);
                if (widget is null)
                {
                    widget = new Widget();
                    widgetDto.ApplyTo(widget);
                    tab.Widgets.Add(widget);
                }
                else
                {
                    widgetDto.ApplyTo(widget);
                }
            }
        }

        report.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return draft.ToContentDto(report);
    }

    /// <summary>Null if the report doesn't exist. Throws <see cref="DataNotFoundException"/> if no draft is checked out.</summary>
    public async Task<ReportVersionSummaryDto?> PublishAsync(int id, string? notes)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return null;

        var draft = await IncludeContent(db.ReportRevisions)
            .FirstOrDefaultAsync(rv => rv.ReportId == report.Id && rv.Kind == RevisionKind.Draft);
        if (draft is null) throw new DataNotFoundException("No draft is checked out.");

        var nextVersion = (await db.ReportRevisions
            .Where(rv => rv.ReportId == report.Id && rv.Kind == RevisionKind.Published)
            .MaxAsync(rv => (int?)rv.VersionNumber) ?? 0) + 1;

        var published = new ReportRevision
        {
            RefId = Guid.NewGuid(),
            ReportId = report.Id,
            Kind = RevisionKind.Published,
            VersionNumber = nextVersion,
            CreatedAt = DateTime.UtcNow,
            PublishedAt = DateTime.UtcNow,
            Notes = notes,
        };
        db.ReportRevisions.Add(published);

        // Deep-copies the draft's widgets + datasets (grid/filters included) into the new version,
        // remapping dataset ids. Widget/column/row RefIds carry over so they keep their identity.
        await CopyContentIntoAsync(published, draft);

        report.UpdatedAt = DateTime.UtcNow;
        db.ReportRevisions.Remove(draft);
        await db.SaveChangesAsync();
        return published.ToVersionSummaryDto();
    }

    public async Task<bool> DiscardDraftAsync(int id)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return false;

        var draft = await db.ReportRevisions
            .FirstOrDefaultAsync(rv => rv.ReportId == report.Id && rv.Kind == RevisionKind.Draft);
        if (draft is null) return false;

        db.ReportRevisions.Remove(draft);
        await db.SaveChangesAsync();
        return true;
    }
}
