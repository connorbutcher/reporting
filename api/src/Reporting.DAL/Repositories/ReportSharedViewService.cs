using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// Shared viewing-filter snapshots: turns a set of filters into a short id a link can carry instead of
/// the filters themselves, and resolves an id back. A snapshot is immutable and per report; sharing the
/// same filters again returns the same id. Both operations are authorized at the controller by an
/// <c>[AuthorizeReport(Viewer)]</c> attribute on the report, and a snapshot is only ever read back
/// through the report it was made for, so an id opens nothing on any other report.
/// </summary>
public class ReportSharedViewService(ReportingDbContext db, ICurrentUserAccessor currentUser)
{
    // Lowercase only, so the id means the same under a case-insensitive database collation.
    private const string Alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";

    // Enough to ride out an id collision or a concurrent share of the same filters, both of which are
    // far rarer than this. Past it the failure is real, and surfaces.
    private const int MaxSaveAttempts = 3;

    /// <summary>The short id for these filters on this report — the existing one if they've been shared before, else a new one.</summary>
    public async Task<ReportSharedViewDto> CreateAsync(int reportId, string filters)
    {
        ViewFiltersFormat.EnsureValid(filters);

        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(filters)));
        var existing = await FindByHashAsync(reportId, hash);
        if (existing is not null) return ToDto(existing);

        var userId = (await currentUser.GetAsync()).Id;
        for (var attempt = 1; ; attempt++)
        {
            var view = new ReportSharedView
            {
                ShortId = NewShortId(),
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
                // Either a concurrent request just shared these same filters (then use its row), or the
                // random id collided (then try another). Forget the failed row before either.
                db.Entry(view).State = EntityState.Detached;
                var raced = await FindByHashAsync(reportId, hash);
                if (raced is not null) return ToDto(raced);
            }
        }
    }

    /// <summary>The filters behind a short id on this report; <c>Filters</c> is null when there is no such snapshot.</summary>
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

    private static string NewShortId() =>
        string.Create(ReportSharedView.ShortIdLength, 0, static (span, _) =>
        {
            for (var i = 0; i < span.Length; i++) span[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
        });
}
