using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Permissions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// Per-user report state: the reports a user has starred (favourites), the reports they've recently
/// opened (recently viewed), and the filters they've saved for viewing a report. All key on the report,
/// not a version — the report is the durable identity a user returns to. Every list is filtered to what the caller may see (through the one
/// <see cref="ResourceAuthorizer"/>) and stamped with their access level, so a viewer never learns a
/// draft exists here either. The star/record-view writes are authorized at the controller by an
/// <c>[AuthorizeReport(Viewer)]</c> attribute, so those don't re-check visibility.
/// </summary>
public class ReportPersonalizationService(
    ReportingDbContext db,
    ResourceAuthorizer authorizer,
    ICurrentUserAccessor currentUser)
{
    /// <summary>The reports the current user has starred that they can still see, name-ordered.</summary>
    public async Task<List<ReportSummaryDto>> GetFavoritesAsync()
    {
        var userId = (await currentUser.GetAsync()).Id;
        var reports = await db.ReportFavorites
            .Where(f => f.UserId == userId)
            .Join(db.Reports.Include(r => r.Revisions), f => f.ReportId, r => r.Id, (_, r) => r)
            .OrderBy(r => r.Name)
            .ToListAsync();
        return await ProjectVisibleAsync(reports, alwaysFavorite: true);
    }

    /// <summary>The current user's most-recently-opened visible reports, newest first, capped at <paramref name="take"/>.</summary>
    public async Task<List<ReportSummaryDto>> GetRecentAsync(int take)
    {
        var userId = (await currentUser.GetAsync()).Id;

        // The recency order lives on the view rows; pull the ordered ids, then load the reports and
        // re-order them in memory. Some may no longer be visible, so the visible-filter happens before
        // the cap — we can't know the final count until then.
        var orderedIds = await db.ReportViews
            .Where(v => v.UserId == userId)
            .OrderByDescending(v => v.ViewedAt)
            .Select(v => v.ReportId)
            .ToListAsync();

        var byId = await db.Reports
            .Include(r => r.Revisions)
            .Where(r => orderedIds.Contains(r.Id))
            .ToDictionaryAsync(r => r.Id);

        var ordered = orderedIds.Where(byId.ContainsKey).Select(id => byId[id]);
        return await ProjectVisibleAsync(ordered, take: take);
    }

    /// <summary>Stars a report for the current user. Idempotent. The controller has already authorized visibility (≥ Viewer).</summary>
    public async Task<bool> AddFavoriteAsync(int reportId)
    {
        var userId = (await currentUser.GetAsync()).Id;
        var exists = await db.ReportFavorites.AnyAsync(f => f.UserId == userId && f.ReportId == reportId);
        if (!exists)
        {
            db.ReportFavorites.Add(new ReportFavorite { UserId = userId, ReportId = reportId, CreatedAt = DateTime.UtcNow });
            await db.SaveChangesAsync();
        }
        return true;
    }

    /// <summary>Removes a user's star. Idempotent, and never blocked — a user can always un-star.</summary>
    public async Task RemoveFavoriteAsync(int reportId)
    {
        var userId = (await currentUser.GetAsync()).Id;
        var favorite = await db.ReportFavorites.FirstOrDefaultAsync(f => f.UserId == userId && f.ReportId == reportId);
        if (favorite is not null)
        {
            db.ReportFavorites.Remove(favorite);
            await db.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Records that the current user just opened a report, updating its timestamp if already present so
    /// the table stays one row per report. The controller has already authorized visibility (≥ Viewer).
    /// </summary>
    public async Task<bool> RecordViewAsync(int reportId)
    {
        var userId = (await currentUser.GetAsync()).Id;
        var view = await db.ReportViews.FirstOrDefaultAsync(v => v.UserId == userId && v.ReportId == reportId);
        if (view is null)
        {
            db.ReportViews.Add(new ReportView { UserId = userId, ReportId = reportId, ViewedAt = DateTime.UtcNow });
        }
        else
        {
            view.ViewedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// The filters the current user last saved for viewing this report, or null if none. The string is
    /// the front-end's own encoding and is returned untouched.
    /// </summary>
    public async Task<string?> GetViewFiltersAsync(int reportId)
    {
        var userId = (await currentUser.GetAsync()).Id;
        return await db.ReportViewStates
            .Where(s => s.UserId == userId && s.ReportId == reportId)
            .Select(s => s.Filters)
            .FirstOrDefaultAsync();
    }

    /// <summary>
    /// Saves the current user's viewing filters for a report, replacing any earlier ones. The controller
    /// has already authorized visibility (≥ Viewer). The value is opaque here, but must look like the
    /// encoding (see <see cref="ViewFiltersFormat"/>).
    /// </summary>
    public async Task SaveViewFiltersAsync(int reportId, string filters)
    {
        ViewFiltersFormat.EnsureValid(filters);

        var userId = (await currentUser.GetAsync()).Id;
        var state = await db.ReportViewStates.FirstOrDefaultAsync(s => s.UserId == userId && s.ReportId == reportId);
        if (state is null)
        {
            db.ReportViewStates.Add(new ReportViewState
            {
                UserId = userId,
                ReportId = reportId,
                Filters = filters,
                UpdatedAt = DateTime.UtcNow,
            });
        }
        else
        {
            state.Filters = filters;
            state.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
    }

    /// <summary>Forgets the current user's saved viewing filters, so the report opens on the published ones. Idempotent, and never blocked.</summary>
    public async Task ClearViewFiltersAsync(int reportId)
    {
        var userId = (await currentUser.GetAsync()).Id;
        await db.ReportViewStates.Where(s => s.UserId == userId && s.ReportId == reportId).ExecuteDeleteAsync();
    }

    /// <summary>Projects reports the caller may see (via the central authorizer), stamping each with the caller's level and favourite state.</summary>
    private async Task<List<ReportSummaryDto>> ProjectVisibleAsync(
        IEnumerable<Report> reports,
        bool alwaysFavorite = false,
        int? take = null)
    {
        var favorites = alwaysFavorite ? null : await FavoriteReportIdsAsync();
        return await authorizer.FilterVisibleReportsAsync(
            reports,
            (report, level) => report.ToSummaryDto(level, alwaysFavorite || favorites!.Contains(report.Id)),
            take);
    }

    private async Task<HashSet<int>> FavoriteReportIdsAsync()
    {
        var userId = (await currentUser.GetAsync()).Id;
        var ids = await db.ReportFavorites.Where(f => f.UserId == userId).Select(f => f.ReportId).ToListAsync();
        return ids.ToHashSet();
    }
}
