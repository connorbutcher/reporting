using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Permissions;

/// <summary>
/// The single place every report, folder and dataset access decision is made: hidden is NotFound so a
/// private object's existence never leaks, below the required level is Forbidden, and a mutation of a
/// published version is ReadOnly. Rides <see cref="PermissionService"/>'s per-request snapshot, so
/// filtering a list costs no extra round trips.
/// </summary>
public class ResourceAuthorizer(ReportingDbContext db, PermissionService permissions, DatasetRepository datasets)
{
    public async Task<ResourceAuthorization> AuthorizeReportAsync(int reportId, AccessLevel required)
    {
        var report = await db.Reports.Include(r => r.Revisions).FirstOrDefaultAsync(r => r.Id == reportId);
        return report is null ? ResourceAuthorization.NotFound : await AuthorizeReportAsync(report, required);
    }

    /// <summary>Its <see cref="Report.Revisions"/> must be loaded.</summary>
    public async Task<ResourceAuthorization> AuthorizeReportAsync(Report report, AccessLevel required)
    {
        var level = await permissions.LevelForReportAsync(report.Id, report.FolderId, report.InheritsPermissions);
        if (!ReportVisibility.IsVisibleAtLevel(report, level))
        {
            return ResourceAuthorization.NotFound;
        }

        return new ResourceAuthorization(level < required ? AccessOutcome.Forbidden : AccessOutcome.Allowed, level);
    }

    /// <summary>No gating: for stamping onto a summary after the action is authorized.</summary>
    public Task<AccessLevel> LevelForReportAsync(Report report)
    {
        return permissions.LevelForReportAsync(report.Id, report.FolderId, report.InheritsPermissions);
    }

    public async Task<ResourceAuthorization> AuthorizeFolderAsync(int folderId, AccessLevel required)
    {
        if (!await db.Folders.AnyAsync(f => f.Id == folderId))
        {
            return ResourceAuthorization.NotFound;
        }

        var level = await permissions.LevelForFolderAsync(folderId);
        if (level < AccessLevel.Viewer)
        {
            return ResourceAuthorization.NotFound; // hidden
        }

        return new ResourceAuthorization(level < required ? AccessOutcome.Forbidden : AccessOutcome.Allowed, level);
    }

    /// <summary>Creating inside a folder (or the root when null) needs Editor on it.</summary>
    public async Task<ResourceAuthorization> AuthorizeCreateInAsync(int? folderId)
    {
        var level = folderId is { } id ? await permissions.LevelForFolderAsync(id) : await permissions.LevelForRootAsync();
        if (folderId is not null && level < AccessLevel.Viewer)
        {
            return ResourceAuthorization.NotFound;
        }

        return new ResourceAuthorization(level < AccessLevel.Editor ? AccessOutcome.Forbidden : AccessOutcome.Allowed, level);
    }

    /// <summary>Against the report that owns the dataset.</summary>
    public async Task<ResourceAuthorization> AuthorizeDatasetAsync(int datasetId, AccessLevel required, bool mutation)
    {
        var owner = await datasets.GetOwnerAsync(datasetId);
        if (owner is null)
        {
            return ResourceAuthorization.NotFound;
        }

        var level = await permissions.LevelForReportAsync(owner.ReportId, owner.FolderId, owner.InheritsPermissions);
        if (level < AccessLevel.Viewer)
        {
            return ResourceAuthorization.NotFound;
        }

        if (level < required)
        {
            return new ResourceAuthorization(AccessOutcome.Forbidden, level);
        }

        if (mutation && !owner.IsDraft)
        {
            return new ResourceAuthorization(AccessOutcome.ReadOnly, level);
        }

        return new ResourceAuthorization(AccessOutcome.Allowed, level);
    }

    /// <summary>Visible reports projected with the caller's level, stopping after <paramref name="take"/> if given.</summary>
    public async Task<List<T>> FilterVisibleReportsAsync<T>(
        IEnumerable<Report> reports, Func<Report, AccessLevel, T> project, int? take = null)
    {
        var visible = new List<T>();
        foreach (var report in reports)
        {
            var level = await permissions.LevelForReportAsync(report.Id, report.FolderId, report.InheritsPermissions);
            if (!ReportVisibility.IsVisibleAtLevel(report, level))
            {
                continue;
            }

            visible.Add(project(report, level));
            if (take is { } t && visible.Count >= t)
            {
                break;
            }
        }
        return visible;
    }

    /// <summary>At least Viewer.</summary>
    public async Task<bool> CanSeeFolderAsync(int folderId)
    {
        return await permissions.LevelForFolderAsync(folderId) >= AccessLevel.Viewer;
    }
}
