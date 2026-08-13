using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>All querying and persistence for reports, their published versions, and the checked-out draft.</summary>
public class ReportRepository(ReportingDbContext db)
{
    /// <summary>Reports directly inside <paramref name="folderRef"/> (root if null) — not the whole tree.</summary>
    public async Task<List<ReportSummaryDto>> GetAllAsync(Guid? folderRef)
    {
        int? folderPk = null;
        if (folderRef is { } fref)
        {
            folderPk = await db.Folders.Where(f => f.RefId == fref).Select(f => (int?)f.Id).FirstOrDefaultAsync();
            if (folderPk is null) return [];
        }

        var reports = await db.Reports
            .Include(r => r.Revisions)
            .Include(r => r.Folder)
            .Where(r => r.FolderId == folderPk)
            .OrderBy(r => r.Name)
            .ToListAsync();
        return reports.Select(r => r.ToSummaryDto()).ToList();
    }

    /// <summary>Every report across every folder, flat — for building a whole-tree picker like the "copy from" report select.</summary>
    public async Task<List<ReportSummaryDto>> GetAllFlatAsync()
    {
        var reports = await db.Reports
            .Include(r => r.Revisions)
            .Include(r => r.Folder)
            .OrderBy(r => r.Name)
            .ToListAsync();
        return reports.Select(r => r.ToSummaryDto()).ToList();
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

        return matches.Select(r => r.ToSearchResultDto(PathFor(r.FolderId))).ToList();
    }

    public async Task<ReportSummaryDto?> GetByIdAsync(Guid id)
    {
        var report = await db.Reports
            .Include(r => r.Revisions)
            .Include(r => r.Folder)
            .FirstOrDefaultAsync(r => r.RefId == id);
        return report?.ToSummaryDto();
    }

    /// <summary>
    /// Throws <see cref="DataValidationException"/> if the folder, or the source report
    /// named by <paramref name="sourceReportRef"/>, doesn't exist.
    /// </summary>
    public async Task<ReportSummaryDto> CreateAsync(string name, Guid? folderRef, Guid? sourceReportRef = null)
    {
        Folder? folder = null;
        if (folderRef is { } fref)
        {
            folder = await db.Folders.FirstOrDefaultAsync(f => f.RefId == fref)
                ?? throw new DataValidationException("Folder does not exist.");
        }

        ReportRevision? source = null;
        if (sourceReportRef is { } sref)
        {
            var sourceReport = await db.Reports.FirstOrDefaultAsync(r => r.RefId == sref)
                ?? throw new DataValidationException("Source report does not exist.");

            source = await db.ReportRevisions
                .Include(rv => rv.Widgets)
                .Where(rv => rv.ReportId == sourceReport.Id && rv.Kind == RevisionKind.Published)
                .OrderByDescending(rv => rv.VersionNumber)
                .FirstOrDefaultAsync()
                ?? await db.ReportRevisions
                    .Include(rv => rv.Widgets)
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
        CopyContentInto(draft, source);
        report.Revisions.Add(draft);

        db.Reports.Add(report);
        await db.SaveChangesAsync();
        return report.ToSummaryDto();
    }

    /// <summary>Null if <paramref name="id"/> doesn't exist. Throws <see cref="DataValidationException"/> if the folder doesn't exist.</summary>
    public async Task<ReportSummaryDto?> UpdateAsync(Guid id, string name, Guid? folderRef)
    {
        var report = await db.Reports
            .Include(r => r.Revisions)
            .Include(r => r.Folder)
            .FirstOrDefaultAsync(r => r.RefId == id);
        if (report is null) return null;

        Folder? folder = null;
        if (folderRef is { } fref)
        {
            folder = await db.Folders.FirstOrDefaultAsync(f => f.RefId == fref)
                ?? throw new DataValidationException("Folder does not exist.");
        }

        report.Name = name;
        report.Folder = folder;
        report.FolderId = folder?.Id;
        report.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return report.ToSummaryDto();
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.RefId == id);
        if (report is null) return false;

        db.Reports.Remove(report);
        await db.SaveChangesAsync();
        return true;
    }

    // --- version history --------------------------------------------------

    public async Task<List<ReportVersionSummaryDto>?> GetVersionsAsync(Guid id)
    {
        var reportPk = await db.Reports.Where(r => r.RefId == id).Select(r => (int?)r.Id).FirstOrDefaultAsync();
        if (reportPk is null) return null;

        var versions = await db.ReportRevisions
            .Where(rv => rv.ReportId == reportPk && rv.Kind == RevisionKind.Published)
            .OrderByDescending(rv => rv.VersionNumber)
            .ToListAsync();

        return versions.Select(v => v.ToVersionSummaryDto()).ToList();
    }

    public async Task<ReportRevisionDto?> GetVersionAsync(Guid id, int versionNumber)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.RefId == id);
        if (report is null) return null;

        var revision = await db.ReportRevisions
            .Include(rv => rv.Widgets)
            .FirstOrDefaultAsync(rv => rv.ReportId == report.Id && rv.Kind == RevisionKind.Published && rv.VersionNumber == versionNumber);
        return revision?.ToContentDto(report);
    }

    // --- draft (checkout / autosave / publish) -----------------------------

    public async Task<ReportRevisionDto?> GetDraftAsync(Guid id)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.RefId == id);
        if (report is null) return null;

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
    public async Task<ReportRevisionDto?> CheckoutAsync(Guid id, int? fromVersionNumber)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.RefId == id);
        if (report is null) return null;

        var existingDraft = await db.ReportRevisions
            .Include(rv => rv.Widgets)
            .FirstOrDefaultAsync(rv => rv.ReportId == report.Id && rv.Kind == RevisionKind.Draft);
        if (existingDraft is not null) return existingDraft.ToContentDto(report);

        ReportRevision? source = fromVersionNumber is { } versionNumber
            ? await db.ReportRevisions
                .Include(rv => rv.Widgets)
                .FirstOrDefaultAsync(rv => rv.ReportId == report.Id && rv.Kind == RevisionKind.Published && rv.VersionNumber == versionNumber)
            : await db.ReportRevisions
                .Include(rv => rv.Widgets)
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
        CopyContentInto(draft, source);

        report.UpdatedAt = DateTime.UtcNow;
        db.ReportRevisions.Add(draft);
        await db.SaveChangesAsync();
        return draft.ToContentDto(report);
    }

    /// <summary>
    /// Copies columns/rows/filters/widgets from <paramref name="source"/> into a freshly-created
    /// <paramref name="target"/> revision. Widget <see cref="Widget.RefId"/>s are carried over unchanged
    /// so a widget keeps its logical identity across versions; only its <see cref="Widget.Id"/> changes.
    /// Leaves defaults in place when <paramref name="source"/> is null.
    /// </summary>
    private static void CopyContentInto(ReportRevision target, ReportRevision? source)
    {
        target.Columns = source?.Columns ?? 12;
        target.Rows = source?.Rows ?? 10;
        target.FiltersJson = source?.FiltersJson ?? "[]";
        if (source is null) return;

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

    /// <summary>Null if the report doesn't exist. Throws <see cref="DataNotFoundException"/> if no draft is checked out.</summary>
    public async Task<ReportRevisionDto?> UpdateDraftAsync(Guid id, ReportRevisionDto dto)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.RefId == id);
        if (report is null) return null;

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
    public async Task<ReportVersionSummaryDto?> PublishAsync(Guid id, string? notes)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.RefId == id);
        if (report is null) return null;

        var draft = await db.ReportRevisions
            .Include(rv => rv.Widgets)
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
            Columns = draft.Columns,
            Rows = draft.Rows,
            CreatedAt = DateTime.UtcNow,
            PublishedAt = DateTime.UtcNow,
            Notes = notes,
            FiltersJson = draft.FiltersJson,
        };
        // Widget RefIds carry over so a published widget shares its predecessor's logical identity.
        CopyContentInto(published, draft);

        report.UpdatedAt = DateTime.UtcNow;
        db.ReportRevisions.Add(published);
        db.ReportRevisions.Remove(draft);
        await db.SaveChangesAsync();
        return published.ToVersionSummaryDto();
    }

    public async Task<bool> DiscardDraftAsync(Guid id)
    {
        var reportPk = await db.Reports.Where(r => r.RefId == id).Select(r => (int?)r.Id).FirstOrDefaultAsync();
        if (reportPk is null) return false;

        var draft = await db.ReportRevisions
            .FirstOrDefaultAsync(rv => rv.ReportId == reportPk && rv.Kind == RevisionKind.Draft);
        if (draft is null) return false;

        db.ReportRevisions.Remove(draft);
        await db.SaveChangesAsync();
        return true;
    }
}
