using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>All querying and persistence for reports, their published versions, and the checked-out draft.</summary>
public class ReportRepository(ReportingDbContext db)
{
    /// <summary>Reports directly inside <paramref name="folderId"/> (root if null) — not the whole tree.</summary>
    public async Task<List<ReportSummaryDto>> GetAllAsync(Guid? folderId)
    {
        var reports = await db.Reports
            .Include(r => r.Revisions)
            .Where(r => r.FolderId == folderId)
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

        string PathFor(Guid? folderId)
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
        var report = await db.Reports.Include(r => r.Revisions).FirstOrDefaultAsync(r => r.Id == id);
        return report?.ToSummaryDto();
    }

    /// <summary>Throws <see cref="DataValidationException"/> if the folder doesn't exist.</summary>
    public async Task<ReportSummaryDto> CreateAsync(string name, Guid? folderId)
    {
        if (folderId is { } fid && !await db.Folders.AnyAsync(f => f.Id == fid))
        {
            throw new DataValidationException("Folder does not exist.");
        }

        var nextNumber = (await db.Reports.MaxAsync(r => (int?)r.Number) ?? 0) + 1;
        var now = DateTime.UtcNow;
        var report = new Report
        {
            Id = Guid.NewGuid(),
            Number = nextNumber,
            Name = name,
            FolderId = folderId,
            CreatedAt = now,
            UpdatedAt = now,
        };
        report.Revisions.Add(new ReportRevision
        {
            Id = Guid.NewGuid(),
            ReportId = report.Id,
            Kind = RevisionKind.Draft,
            CreatedAt = now,
        });

        db.Reports.Add(report);
        await db.SaveChangesAsync();
        return report.ToSummaryDto();
    }

    /// <summary>Null if <paramref name="id"/> doesn't exist. Throws <see cref="DataValidationException"/> if the folder doesn't exist.</summary>
    public async Task<ReportSummaryDto?> UpdateAsync(Guid id, string name, Guid? folderId)
    {
        var report = await db.Reports.Include(r => r.Revisions).FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return null;

        if (folderId is { } fid && !await db.Folders.AnyAsync(f => f.Id == fid))
        {
            throw new DataValidationException("Folder does not exist.");
        }

        report.Name = name;
        report.FolderId = folderId;
        report.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return report.ToSummaryDto();
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return false;

        db.Reports.Remove(report);
        await db.SaveChangesAsync();
        return true;
    }

    // --- version history --------------------------------------------------

    public async Task<List<ReportVersionSummaryDto>?> GetVersionsAsync(Guid id)
    {
        if (!await db.Reports.AnyAsync(r => r.Id == id)) return null;

        var versions = await db.ReportRevisions
            .Where(rv => rv.ReportId == id && rv.Kind == RevisionKind.Published)
            .OrderByDescending(rv => rv.VersionNumber)
            .ToListAsync();

        return versions.Select(v => v.ToVersionSummaryDto()).ToList();
    }

    public async Task<ReportRevisionDto?> GetVersionAsync(Guid id, int versionNumber)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return null;

        var revision = await db.ReportRevisions
            .Include(rv => rv.Widgets)
            .FirstOrDefaultAsync(rv => rv.ReportId == id && rv.Kind == RevisionKind.Published && rv.VersionNumber == versionNumber);
        return revision?.ToContentDto(report);
    }

    // --- draft (checkout / autosave / publish) -----------------------------

    public async Task<ReportRevisionDto?> GetDraftAsync(Guid id)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return null;

        var draft = await db.ReportRevisions
            .Include(rv => rv.Widgets)
            .FirstOrDefaultAsync(rv => rv.ReportId == id && rv.Kind == RevisionKind.Draft);
        return draft?.ToContentDto(report);
    }

    /// <summary>
    /// Checks out a draft to edit. Idempotent: an existing draft is returned as-is.
    /// Null if the report doesn't exist. Throws <see cref="DataNotFoundException"/>
    /// if a specific source version was requested and doesn't exist.
    /// </summary>
    public async Task<ReportRevisionDto?> CheckoutAsync(Guid id, int? fromVersionNumber)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return null;

        var existingDraft = await db.ReportRevisions
            .Include(rv => rv.Widgets)
            .FirstOrDefaultAsync(rv => rv.ReportId == id && rv.Kind == RevisionKind.Draft);
        if (existingDraft is not null) return existingDraft.ToContentDto(report);

        ReportRevision? source = fromVersionNumber is { } versionNumber
            ? await db.ReportRevisions
                .Include(rv => rv.Widgets)
                .FirstOrDefaultAsync(rv => rv.ReportId == id && rv.Kind == RevisionKind.Published && rv.VersionNumber == versionNumber)
            : await db.ReportRevisions
                .Include(rv => rv.Widgets)
                .Where(rv => rv.ReportId == id && rv.Kind == RevisionKind.Published)
                .OrderByDescending(rv => rv.VersionNumber)
                .FirstOrDefaultAsync();

        if (fromVersionNumber is not null && source is null) throw new DataNotFoundException("Version not found.");

        var draft = new ReportRevision
        {
            Id = Guid.NewGuid(),
            ReportId = id,
            Kind = RevisionKind.Draft,
            Columns = source?.Columns ?? 12,
            Rows = source?.Rows ?? 10,
            CreatedAt = DateTime.UtcNow,
            FiltersJson = source?.FiltersJson ?? "[]",
        };

        if (source is not null)
        {
            foreach (var widget in source.Widgets)
            {
                draft.Widgets.Add(new Widget
                {
                    Id = Guid.NewGuid(),
                    ReportRevisionId = draft.Id,
                    Type = widget.Type,
                    X = widget.X,
                    Y = widget.Y,
                    W = widget.W,
                    H = widget.H,
                    ConfigJson = widget.ConfigJson,
                });
            }
        }

        report.UpdatedAt = DateTime.UtcNow;
        db.ReportRevisions.Add(draft);
        await db.SaveChangesAsync();
        return draft.ToContentDto(report);
    }

    /// <summary>Null if the report doesn't exist. Throws <see cref="DataNotFoundException"/> if no draft is checked out.</summary>
    public async Task<ReportRevisionDto?> UpdateDraftAsync(Guid id, ReportRevisionDto dto)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return null;

        var draft = await db.ReportRevisions
            .Include(rv => rv.Widgets)
            .FirstOrDefaultAsync(rv => rv.ReportId == id && rv.Kind == RevisionKind.Draft);
        if (draft is null) throw new DataNotFoundException("No draft is checked out.");

        draft.Columns = Math.Max(1, dto.Columns);
        draft.Rows = Math.Max(1, dto.Rows);
        draft.SetFilters(dto.Filters);

        var incomingIds = dto.Widgets.Select(w => w.Id).ToHashSet();
        draft.Widgets.RemoveAll(w => !incomingIds.Contains(w.Id));

        foreach (var widgetDto in dto.Widgets)
        {
            var widget = draft.Widgets.FirstOrDefault(w => w.Id == widgetDto.Id);
            if (widget is null)
            {
                widget = new Widget { ReportRevisionId = draft.Id };
                widgetDto.ApplyTo(widget);
                draft.Widgets.Add(widget);

                // Widget ids are generated by the client, so change detection would
                // otherwise read this as an existing row and emit an UPDATE that
                // matches nothing. Mark it as an insert explicitly.
                db.Entry(widget).State = EntityState.Added;
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
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return null;

        var draft = await db.ReportRevisions
            .Include(rv => rv.Widgets)
            .FirstOrDefaultAsync(rv => rv.ReportId == id && rv.Kind == RevisionKind.Draft);
        if (draft is null) throw new DataNotFoundException("No draft is checked out.");

        var nextVersion = (await db.ReportRevisions
            .Where(rv => rv.ReportId == id && rv.Kind == RevisionKind.Published)
            .MaxAsync(rv => (int?)rv.VersionNumber) ?? 0) + 1;

        var published = new ReportRevision
        {
            Id = Guid.NewGuid(),
            ReportId = id,
            Kind = RevisionKind.Published,
            VersionNumber = nextVersion,
            Columns = draft.Columns,
            Rows = draft.Rows,
            CreatedAt = DateTime.UtcNow,
            PublishedAt = DateTime.UtcNow,
            Notes = notes,
            FiltersJson = draft.FiltersJson,
        };
        foreach (var widget in draft.Widgets)
        {
            published.Widgets.Add(new Widget
            {
                Id = Guid.NewGuid(),
                ReportRevisionId = published.Id,
                Type = widget.Type,
                X = widget.X,
                Y = widget.Y,
                W = widget.W,
                H = widget.H,
                ConfigJson = widget.ConfigJson,
            });
        }

        report.UpdatedAt = DateTime.UtcNow;
        db.ReportRevisions.Add(published);
        db.ReportRevisions.Remove(draft);
        await db.SaveChangesAsync();
        return published.ToVersionSummaryDto();
    }

    public async Task<bool> DiscardDraftAsync(Guid id)
    {
        var draft = await db.ReportRevisions
            .FirstOrDefaultAsync(rv => rv.ReportId == id && rv.Kind == RevisionKind.Draft);
        if (draft is null) return false;

        db.ReportRevisions.Remove(draft);
        await db.SaveChangesAsync();
        return true;
    }
}
