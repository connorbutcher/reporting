using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// Turns viewing filters into a short id a link carries instead of the filters, and back. Snapshots
/// are immutable and per report; the same filters always get the same id. Authorized at the
/// controller, and a snapshot is only read through the report it was made for.
/// </summary>
public class ReportSharedViewService(ReportingDbContext db, ICurrentUserAccessor currentUser)
{
    // Covers a concurrent share of the same filters or an id collision, both far rarer than this.
    private const int MaxSaveAttempts = 3;

    public async Task<ReportSharedViewDto> CreateAsync(int reportId, string filters)
    {
        ViewFiltersFormat.EnsureValid(filters);

        var hash = SharedViewIds.HashOf(filters);
        var existing = await FindByHashAsync(reportId, hash);
        if (existing is not null) return ToDto(existing);

        var userId = (await currentUser.GetAsync()).Id;
        for (var attempt = 1; ; attempt++)
        {
            var view = new ReportSharedView
            {
                ShortId = SharedViewIds.New(),
                ReportId = reportId,
                Filters = filters,
                FiltersHash = hash,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow,
            };
            db.ReportSharedViews.Add(view);
            try
            {
                await db.SaveChangesAsync();
                return ToDto(view);
            }
            catch (DbUpdateException) when (attempt < MaxSaveAttempts)
            {
                // Either a concurrent request shared these filters (use its row) or the id collided (retry).
                db.Entry(view).State = EntityState.Detached;
                var raced = await FindByHashAsync(reportId, hash);
                if (raced is not null) return ToDto(raced);
            }
        }
    }

    /// <summary><c>Filters</c> is null when this report has no such snapshot.</summary>
    public async Task<ReportSharedViewDto> GetAsync(int reportId, string viewId)
    {
        string? filters = null;
        if (viewId.Length <= ReportSharedView.ShortIdLength)
        {
            var id = viewId.ToLowerInvariant();
            filters = await db.ReportSharedViews
                .Where(v => v.ReportId == reportId && v.ShortId == id)
                .Select(v => v.Filters)
                .FirstOrDefaultAsync();
        }
        return new ReportSharedViewDto { Id = viewId, Filters = filters };
    }

    private Task<ReportSharedView?> FindByHashAsync(int reportId, string hash) =>
        db.ReportSharedViews.AsNoTracking().FirstOrDefaultAsync(v => v.ReportId == reportId && v.FiltersHash == hash);

    private static ReportSharedViewDto ToDto(ReportSharedView view) => new() { Id = view.ShortId, Filters = view.Filters };
}
