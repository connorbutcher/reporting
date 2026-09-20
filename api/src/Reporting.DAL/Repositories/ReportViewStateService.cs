using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// A user's saved filters for viewing a report, keyed on the report so they outlive versions. The
/// value is the front-end's encoding, stored as is. Authorized at the controller.
/// </summary>
public class ReportViewStateService(ReportingDbContext db, ICurrentUserAccessor currentUser)
{
    /// <summary>Null when the user has nothing saved.</summary>
    public async Task<string?> GetAsync(int reportId)
    {
        var userId = (await currentUser.GetAsync()).Id;
        return await Rows(userId, reportId).Select(s => s.Filters).FirstOrDefaultAsync();
    }

    public async Task SaveAsync(int reportId, string filters)
    {
        ViewFiltersFormat.EnsureValid(filters);

        var userId = (await currentUser.GetAsync()).Id;
        if (await UpdateAsync(userId, reportId, filters) > 0) return;

        db.ReportViewStates.Add(new ReportViewState
        {
            UserId = userId,
            ReportId = reportId,
            Filters = filters,
            UpdatedAt = DateTime.UtcNow,
        });
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // A concurrent first save inserted the row; ours becomes an update of it.
            db.ChangeTracker.Clear();
            await UpdateAsync(userId, reportId, filters);
        }
    }

    /// <summary>Idempotent.</summary>
    public async Task ClearAsync(int reportId)
    {
        var userId = (await currentUser.GetAsync()).Id;
        await Rows(userId, reportId).ExecuteDeleteAsync();
    }

    private IQueryable<ReportViewState> Rows(int userId, int reportId) =>
        db.ReportViewStates.Where(s => s.UserId == userId && s.ReportId == reportId);

    private Task<int> UpdateAsync(int userId, int reportId, string filters)
    {
        var now = DateTime.UtcNow;
        return Rows(userId, reportId).ExecuteUpdateAsync(s => s
            .SetProperty(x => x.Filters, filters)
            .SetProperty(x => x.UpdatedAt, now));
    }
}
