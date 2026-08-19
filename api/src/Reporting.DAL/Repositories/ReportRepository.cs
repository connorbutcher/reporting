using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Permissions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// All querying and persistence for reports, their published versions, and the checked-out
/// draft. Reads are filtered to reports the current user can see (an invisible one is absent,
/// and a lookup of it returns null → 404); mutations and draft/publish actions are guarded to
/// the level the enforcement matrix requires.
/// </summary>
public class ReportRepository(ReportingDbContext db, PermissionService permissions)
{
    /// <summary>Reports directly inside <paramref name="folderId"/> (root if null) — not the whole tree.</summary>
    public async Task<List<ReportSummaryDto>> GetAllAsync(int? folderId)
    {
        if (folderId is { } fid && !await db.Folders.AnyAsync(f => f.Id == fid)) return [];

        var reports = await db.Reports
            .Include(r => r.Revisions)
            .Where(r => r.FolderId == folderId)
            .OrderBy(r => r.Name)
            .ToListAsync();
        return await FilterVisibleAsync(reports, r => r.ToSummaryDto());
    }

    /// <summary>Every report across every folder, flat — for building a whole-tree picker like the "copy from" report select.</summary>
    public async Task<List<ReportSummaryDto>> GetAllFlatAsync()
    {
        var reports = await db.Reports
            .Include(r => r.Revisions)
            .OrderBy(r => r.Name)
            .ToListAsync();
        return await FilterVisibleAsync(reports, r => r.ToSummaryDto());
    }

    /// <summary>Keeps only the reports the current user can see, projecting each survivor.</summary>
    private async Task<List<T>> FilterVisibleAsync<T>(IEnumerable<Report> reports, Func<Report, T> project)
    {
        var visible = new List<T>();
        foreach (var report in reports)
        {
            if (await permissions.CanSeeReportAsync(report.Id, report.FolderId, report.InheritsPermissions))
                visible.Add(project(report));
        }
        return visible;
    }

    /// <summary>Finds reports anywhere in the tree by name (contains) or exact report number (accepts "42" or "R-42").</summary>
    public async Task<List<ReportSearchResultDto>> SearchAsync(string? query)
    {
        if (string.IsNullOrWhiteSpace(query)) return [];

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

        return await FilterVisibleAsync(matches, r => r.ToSearchResultDto(PathFor(r.FolderId)));
    }

    public async Task<ReportSummaryDto?> GetByIdAsync(int id)
    {
        var report = await db.Reports
            .Include(r => r.Revisions)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (report is null || !await CanSeeAsync(report)) return null;
        return report.ToSummaryDto();
    }

    /// <summary>Whether the current user can see the report at all (≥ Viewer).</summary>
    private Task<bool> CanSeeAsync(Report report) =>
        permissions.CanSeeReportAsync(report.Id, report.FolderId, report.InheritsPermissions);

    /// <summary>
    /// Enforces a level on a report the caller has already loaded: an invisible report is hidden
    /// (returns false → the caller 404s), a visible one below <paramref name="required"/> throws
    /// (403). Returns true when the action may proceed.
    /// </summary>
    private async Task<bool> AuthorizeAsync(Report report, AccessLevel required)
    {
        var level = await permissions.LevelForReportAsync(report.Id, report.FolderId, report.InheritsPermissions);
        if (level < AccessLevel.Viewer) return false; // hidden — surfaces as 404
        if (level < required) throw new AccessDeniedException($"This action requires {required} access.");
        return true;
    }

    /// <summary>
    /// Throws <see cref="DataValidationException"/> if the folder, or the source report
    /// named by <paramref name="sourceReportId"/>, doesn't exist.
    /// </summary>
    public async Task<ReportSummaryDto> CreateAsync(string name, int? folderId, int? sourceReportId = null)
    {
        Folder? folder = null;
        if (folderId is { } fid)
        {
            folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == fid)
                ?? throw new DataValidationException("Folder does not exist.");
        }

        // Creating a report is an Editor action on the destination folder (or the root).
        await permissions.RequireCreateInAsync(folder?.Id);

        ReportRevision? source = null;
        if (sourceReportId is { } sid)
        {
            var sourceReport = await db.Reports.FirstOrDefaultAsync(r => r.Id == sid)
                ?? throw new DataValidationException("Source report does not exist.");

            // You can only duplicate a report you're allowed to see.
            if (!await CanSeeAsync(sourceReport))
                throw new DataValidationException("Source report does not exist.");

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
        return report.ToSummaryDto();
    }

    /// <summary>Null if <paramref name="id"/> doesn't exist. Throws <see cref="DataValidationException"/> if the folder doesn't exist.</summary>
    public async Task<ReportSummaryDto?> UpdateAsync(int id, string name, int? folderId)
    {
        var report = await db.Reports
            .Include(r => r.Revisions)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return null;
        // Renaming or moving a report is a Manager action on it.
        if (!await AuthorizeAsync(report, AccessLevel.Manager)) return null;

        Folder? folder = null;
        if (folderId is { } fid)
        {
            folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == fid)
                ?? throw new DataValidationException("Folder does not exist.");
        }

        // Moving into a different folder also needs Editor on the destination.
        if (report.FolderId != folder?.Id) await permissions.RequireCreateInAsync(folder?.Id);

        report.Name = name;
        report.FolderId = folder?.Id;
        report.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return report.ToSummaryDto();
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return false;
        // Hide an invisible report as a 404; deleting one you can see needs Manager.
        if (!await AuthorizeAsync(report, AccessLevel.Manager)) return false;

        db.Reports.Remove(report);
        await db.SaveChangesAsync();
        return true;
    }

    // --- version history --------------------------------------------------

    public async Task<List<ReportVersionSummaryDto>?> GetVersionsAsync(int id)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null || !await CanSeeAsync(report)) return null;

        var versions = await db.ReportRevisions
            .Where(rv => rv.ReportId == report.Id && rv.Kind == RevisionKind.Published)
            .OrderByDescending(rv => rv.VersionNumber)
            .ToListAsync();

        return versions.Select(v => v.ToVersionSummaryDto()).ToList();
    }

    public async Task<ReportRevisionDto?> GetVersionAsync(int id, int versionNumber)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null || !await CanSeeAsync(report)) return null;

        var revision = await db.ReportRevisions
            .Include(rv => rv.Widgets)
            .FirstOrDefaultAsync(rv => rv.ReportId == report.Id && rv.Kind == RevisionKind.Published && rv.VersionNumber == versionNumber);
        return revision?.ToContentDto(report);
    }

    // --- draft (checkout / autosave / publish) -----------------------------

    public async Task<ReportRevisionDto?> GetDraftAsync(int id)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return null;
        // The draft is the editing surface, so seeing it is an Editor action.
        if (!await AuthorizeAsync(report, AccessLevel.Editor)) return null;

        var draft = await db.ReportRevisions
            .Include(rv => rv.Widgets)
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
        if (!await AuthorizeAsync(report, AccessLevel.Editor)) return null;

        var existingDraft = await db.ReportRevisions
            .Include(rv => rv.Widgets)
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
            .Include(rv => rv.Widgets)
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
        target.Columns = source?.Columns ?? 48;
        target.Rows = source?.Rows ?? 30;
        target.FiltersJson = source?.FiltersJson ?? "[]";

        // Widget configs still reference the source's dataset primary keys here; they're remapped
        // once the copied datasets have been saved and their new keys are known.
        if (source is not null)
        {
            foreach (var widget in source.Widgets)
            {
                target.Widgets.Add(new Widget
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
        }

        // Copy each dataset's shell (columns + rows, preserving their RefIds). Cells reference their
        // column by int id, which isn't known until the columns are saved, so they're deferred to a
        // second phase — the same two-step the seeder uses.
        var datasetCopies = new List<DatasetCopy>();
        if (source is not null)
        {
            foreach (var sourceDataset in source.Datasets)
            {
                var copy = new Dataset { Name = sourceDataset.Name };

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
        foreach (var widget in target.Widgets)
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
        if (!await AuthorizeAsync(report, AccessLevel.Editor)) return null;

        var draft = await db.ReportRevisions
            .Include(rv => rv.Widgets)
            .FirstOrDefaultAsync(rv => rv.ReportId == report.Id && rv.Kind == RevisionKind.Draft);
        if (draft is null) throw new DataNotFoundException("No draft is checked out.");

        draft.Columns = Math.Max(1, dto.Columns);
        draft.Rows = Math.Max(1, dto.Rows);
        draft.SetFilters(dto.Filters);

        // Widgets are addressed by their client-generated RefId, which is stable across versions.
        var incomingRefs = dto.Widgets.Select(w => w.Id).ToHashSet();
        draft.Widgets.RemoveAll(w => !incomingRefs.Contains(w.RefId));

        foreach (var widgetDto in dto.Widgets)
        {
            var widget = draft.Widgets.FirstOrDefault(w => w.RefId == widgetDto.Id);
            if (widget is null)
            {
                widget = new Widget();
                widgetDto.ApplyTo(widget);
                draft.Widgets.Add(widget);
            }
            else
            {
                widgetDto.ApplyTo(widget);
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
        // Publishing is an Editor action.
        if (!await AuthorizeAsync(report, AccessLevel.Editor)) return null;

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
        // Discarding a draft is an Editor action; an invisible report is hidden as a 404.
        if (!await AuthorizeAsync(report, AccessLevel.Editor)) return false;

        var draft = await db.ReportRevisions
            .FirstOrDefaultAsync(rv => rv.ReportId == report.Id && rv.Kind == RevisionKind.Draft);
        if (draft is null) return false;

        db.ReportRevisions.Remove(draft);
        await db.SaveChangesAsync();
        return true;
    }
}
