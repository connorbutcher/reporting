using Microsoft.EntityFrameworkCore;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

internal static class RevisionQueries
{
    /// <summary>Everything needed to deep-copy a revision: tabs, widgets and the datasets' full graph.</summary>
    public static IQueryable<ReportRevision> IncludeContent(IQueryable<ReportRevision> revisions)
    {
        return revisions
            .Include(rv => rv.Tabs).ThenInclude(t => t.Widgets)
            .Include(rv => rv.Datasets).ThenInclude(d => d.Columns)
            .Include(rv => rv.Datasets).ThenInclude(d => d.Rows).ThenInclude(r => r.Cells);
    }

    public static IQueryable<ReportRevision> IncludeLayout(IQueryable<ReportRevision> revisions)
    {
        return revisions.Include(rv => rv.Tabs).ThenInclude(t => t.Widgets);
    }

    public static IQueryable<ReportRevision> Published(IQueryable<ReportRevision> revisions, int reportId)
    {
        return revisions.Where(rv => rv.ReportId == reportId && rv.Kind == RevisionKind.Published);
    }

    public static Task<ReportRevision?> LatestPublishedAsync(IQueryable<ReportRevision> revisions, int reportId)
    {
        return Published(revisions, reportId).OrderByDescending(rv => rv.VersionNumber).FirstOrDefaultAsync();
    }

    public static Task<ReportRevision?> PublishedVersionAsync(IQueryable<ReportRevision> revisions, int reportId, int versionNumber)
    {
        return revisions.FirstOrDefaultAsync(rv =>
            rv.ReportId == reportId && rv.Kind == RevisionKind.Published && rv.VersionNumber == versionNumber);
    }

    public static Task<ReportRevision?> DraftAsync(IQueryable<ReportRevision> revisions, int reportId)
    {
        return revisions.FirstOrDefaultAsync(rv => rv.ReportId == reportId && rv.Kind == RevisionKind.Draft);
    }
}
