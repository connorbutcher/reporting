using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// Querying and persistence for reports, their published versions and the checked-out draft. Makes no
/// authorization decisions: the controller authorizes each action and filters listings first.
/// </summary>
public class ReportRepository(ReportingDbContext db, ICurrentUserAccessor currentUser)
{
    private readonly RevisionContentCopier _copier = new(db);

    /// <summary>Unfiltered, name-ordered, with revisions loaded. Root when <paramref name="folderId"/> is null.</summary>
    public async Task<List<Report>> GetInFolderAsync(int? folderId)
    {
        if (folderId is { } fid && !await db.Folders.AnyAsync(f => f.Id == fid))
        {
            return [];
        }

        return await db.Reports
            .Include(r => r.Revisions)
            .Where(r => r.FolderId == folderId)
            .OrderBy(r => r.Name)
            .ToListAsync();
    }

    public async Task<List<Report>> GetAllAsync()
    {
        return await db.Reports.Include(r => r.Revisions).OrderBy(r => r.Name).ToListAsync();
    }

    public async Task<HashSet<int>> FavoriteReportIdsAsync()
    {
        var userId = (await currentUser.GetAsync()).Id;
        var ids = await db.ReportFavorites.Where(f => f.UserId == userId).Select(f => f.ReportId).ToListAsync();
        return ids.ToHashSet();
    }

    /// <summary>Name contains the query, or the number matches it ("42" or "R-42"). Unfiltered.</summary>
    public async Task<ReportSearchResults> SearchAsync(string? query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return new ReportSearchResults([], new Dictionary<int, string>());
        }

        var trimmed = query.Trim();
        var nameMatches = await db.Reports
            .Include(r => r.Revisions)
            .Where(r => EF.Functions.Like(r.Name, $"%{trimmed}%"))
            .ToListAsync();
        var numberMatches = await FindByNumberAsync(trimmed);

        var matches = nameMatches.Concat(numberMatches)
            .GroupBy(r => r.Id)
            .Select(g => g.First())
            .OrderBy(r => r.Name)
            .Take(100)
            .ToList();

        // The folder tree is small, so one load beats walking each result's ancestors.
        var foldersById = await db.Folders.ToDictionaryAsync(f => f.Id);
        var paths = matches.ToDictionary(r => r.Id, r => FolderPaths.Describe(r.FolderId, foldersById));
        return new ReportSearchResults(matches, paths);
    }

    public Task<Report?> GetEntityAsync(int id)
    {
        return db.Reports.Include(r => r.Revisions).FirstOrDefaultAsync(r => r.Id == id);
    }

    /// <summary>
    /// Checked against every sibling, visible or not, since a report's own ACL can hide it from a folder
    /// editor. Only answers yes/no, so it can't enumerate hidden names.
    /// </summary>
    public async Task<bool> NameAvailableAsync(string? name, int? folderId, int? excludeId = null)
    {
        var trimmed = (name ?? string.Empty).Trim();
        if (trimmed.Length == 0)
        {
            return true;
        }

        return !await db.Reports.AnyAsync(r => r.FolderId == folderId && r.Name == trimmed && r.Id != excludeId);
    }

    /// <summary>Optionally copies <paramref name="sourceReportId"/>'s latest content into the new draft.</summary>
    public async Task<Report> CreateAsync(string name, int? folderId, int? sourceReportId = null)
    {
        var folder = await FindFolderAsync(folderId);
        var source = sourceReportId is { } sid ? await FindCopySourceAsync(sid) : null;

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
        var draft = new ReportRevision { RefId = Guid.NewGuid(), Kind = RevisionKind.Draft, CreatedAt = now };
        report.Revisions.Add(draft);
        db.Reports.Add(report);

        await _copier.CopyAsync(draft, source);
        return report;
    }

    public async Task<Report?> UpdateAsync(int id, string name, int? destinationFolderId)
    {
        var report = await db.Reports
            .Include(r => r.Revisions)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (report is null)
        {
            return null;
        }

        var folder = await FindFolderAsync(destinationFolderId);
        report.Name = name;
        report.FolderId = folder?.Id;
        report.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return report;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null)
        {
            return false;
        }

        db.Reports.Remove(report);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<List<ReportVersionSummaryDto>?> GetVersionsAsync(int id)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null)
        {
            return null;
        }

        var versions = await RevisionQueries.Published(db.ReportRevisions, report.Id)
            .OrderByDescending(rv => rv.VersionNumber)
            .ToListAsync();
        return versions.Select(v => v.ToVersionSummaryDto()).ToList();
    }

    public async Task<ReportRevisionDto?> GetVersionAsync(int id, int versionNumber)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null)
        {
            return null;
        }

        var revision = await RevisionQueries.PublishedVersionAsync(RevisionQueries.IncludeLayout(db.ReportRevisions), report.Id, versionNumber);
        return revision?.ToContentDto(report);
    }

    public async Task<ReportRevisionDto?> GetDraftAsync(int id)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null)
        {
            return null;
        }

        var draft = await RevisionQueries.DraftAsync(RevisionQueries.IncludeLayout(db.ReportRevisions), report.Id);
        return draft?.ToContentDto(report);
    }

    /// <summary>
    /// Idempotent: an existing draft is returned as-is. Null if the report doesn't exist; throws
    /// <see cref="DataNotFoundException"/> if the requested source version doesn't.
    /// </summary>
    public async Task<ReportRevisionDto?> CheckoutAsync(int id, int? fromVersionNumber)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null)
        {
            return null;
        }

        var existingDraft = await RevisionQueries.DraftAsync(RevisionQueries.IncludeLayout(db.ReportRevisions), report.Id);
        if (existingDraft is not null)
        {
            return existingDraft.ToContentDto(report);
        }

        var source = await FindCheckoutSourceAsync(report.Id, fromVersionNumber);
        var draft = new ReportRevision
        {
            RefId = Guid.NewGuid(),
            ReportId = report.Id,
            Kind = RevisionKind.Draft,
            CreatedAt = DateTime.UtcNow,
        };
        report.UpdatedAt = DateTime.UtcNow;
        db.ReportRevisions.Add(draft);
        await _copier.CopyAsync(draft, source);
        return draft.ToContentDto(report);
    }

    /// <summary>Null if the report doesn't exist. Throws <see cref="DataNotFoundException"/> if no draft is checked out.</summary>
    public async Task<ReportRevisionDto?> UpdateDraftAsync(int id, ReportRevisionDto dto)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null)
        {
            return null;
        }

        var draft = await RevisionQueries.DraftAsync(RevisionQueries.IncludeLayout(db.ReportRevisions), report.Id)
            ?? throw new DataNotFoundException("No draft is checked out.");

        draft.SetFilters(dto.Filters);
        DraftLayoutSync.Apply(draft, dto);

        report.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return draft.ToContentDto(report);
    }

    /// <summary>Null if the report doesn't exist. Throws <see cref="DataNotFoundException"/> if no draft is checked out.</summary>
    public async Task<ReportVersionSummaryDto?> PublishAsync(int id, string? notes)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null)
        {
            return null;
        }

        var draft = await RevisionQueries.DraftAsync(RevisionQueries.IncludeContent(db.ReportRevisions), report.Id)
            ?? throw new DataNotFoundException("No draft is checked out.");

        var nextVersion = (await RevisionQueries.Published(db.ReportRevisions, report.Id)
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
        await _copier.CopyAsync(published, draft);

        report.UpdatedAt = DateTime.UtcNow;
        db.ReportRevisions.Remove(draft);
        await db.SaveChangesAsync();
        return published.ToVersionSummaryDto();
    }

    public async Task<bool> DiscardDraftAsync(int id)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null)
        {
            return false;
        }

        var draft = await RevisionQueries.DraftAsync(db.ReportRevisions, report.Id);
        if (draft is null)
        {
            return false;
        }

        db.ReportRevisions.Remove(draft);
        await db.SaveChangesAsync();
        return true;
    }

    private async Task<List<Report>> FindByNumberAsync(string query)
    {
        var numericPart = query.StartsWith("R-", StringComparison.OrdinalIgnoreCase) ? query[2..] : query;
        if (!int.TryParse(numericPart, out var number))
        {
            return [];
        }

        return await db.Reports.Include(r => r.Revisions).Where(r => r.Number == number).ToListAsync();
    }

    /// <summary>Throws <see cref="DataValidationException"/> when the folder doesn't exist.</summary>
    private async Task<Folder?> FindFolderAsync(int? folderId)
    {
        if (folderId is not { } fid)
        {
            return null;
        }

        return await db.Folders.FirstOrDefaultAsync(f => f.Id == fid)
            ?? throw new DataValidationException("Folder does not exist.");
    }

    /// <summary>The latest published version, else the draft.</summary>
    private async Task<ReportRevision?> FindCopySourceAsync(int sourceReportId)
    {
        var sourceReport = await db.Reports.FirstOrDefaultAsync(r => r.Id == sourceReportId)
            ?? throw new DataValidationException("Source report does not exist.");

        return await RevisionQueries.LatestPublishedAsync(RevisionQueries.IncludeContent(db.ReportRevisions), sourceReport.Id)
            ?? await RevisionQueries.DraftAsync(RevisionQueries.IncludeContent(db.ReportRevisions), sourceReport.Id);
    }

    /// <summary>The requested version, or the latest published one when none was requested.</summary>
    private async Task<ReportRevision?> FindCheckoutSourceAsync(int reportId, int? fromVersionNumber)
    {
        var revisions = RevisionQueries.IncludeContent(db.ReportRevisions);
        if (fromVersionNumber is not { } versionNumber)
        {
            return await RevisionQueries.LatestPublishedAsync(revisions, reportId);
        }

        return await RevisionQueries.PublishedVersionAsync(revisions, reportId, versionNumber)
            ?? throw new DataNotFoundException("Version not found.");
    }
}
