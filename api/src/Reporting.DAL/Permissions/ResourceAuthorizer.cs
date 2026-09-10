using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Permissions;

/// <summary>How an authorization check came out, before it's turned into an HTTP status.</summary>
public enum AccessOutcome
{
    /// <summary>The caller may proceed.</summary>
    Allowed,

    /// <summary>The target doesn't exist, or is hidden from the caller — surfaces as 404 so nothing private leaks.</summary>
    NotFound,

    /// <summary>The caller can see the target but lacks the level the action needs — surfaces as 403.</summary>
    Forbidden,

    /// <summary>A mutation was aimed at a published version's immutable data — surfaces as 400.</summary>
    ReadOnly
}

/// <summary>An authorization decision: the outcome plus the caller's resolved level on the target.</summary>
public sealed record ResourceAuthorization(AccessOutcome Outcome, AccessLevel Level)
{
    public bool Allowed => Outcome == AccessOutcome.Allowed;

    public static ResourceAuthorization NotFound { get; } = new(AccessOutcome.NotFound, AccessLevel.None);
}

/// <summary>
/// The single place every report/folder/dataset access decision is made. Wraps the pure level
/// resolution of <see cref="PermissionService"/> with the policy layer around it — the required-level
/// comparison and the "hidden ⇒ 404, visible-but-insufficient ⇒ 403, immutable ⇒ 400" masking that
/// keeps a private object's existence from leaking. Controllers and their authorization attributes
/// call this instead of re-implementing the resolve→mask→compare dance; repositories no longer make
/// authorization decisions at all. Because it rides <see cref="PermissionService"/>'s per-request
/// snapshot, resolving many items (e.g. filtering a list) costs no extra round trips. Scoped.
/// </summary>
public class ResourceAuthorizer(ReportingDbContext db, PermissionService permissions, DatasetRepository datasets)
{
    // --- reports ----------------------------------------------------------

    /// <summary>
    /// Authorizes an action on a report by id: a report the caller can't see (or that doesn't exist)
    /// is <see cref="AccessOutcome.NotFound"/>, one below <paramref name="required"/> is
    /// <see cref="AccessOutcome.Forbidden"/>, otherwise <see cref="AccessOutcome.Allowed"/>.
    /// </summary>
    public async Task<ResourceAuthorization> AuthorizeReportAsync(int reportId, AccessLevel required)
    {
        var report = await db.Reports.Include(r => r.Revisions).FirstOrDefaultAsync(r => r.Id == reportId);
        return report is null ? ResourceAuthorization.NotFound : await AuthorizeReportAsync(report, required);
    }

    /// <summary>Authorizes a report the caller has already loaded (its <see cref="Report.Revisions"/> must be included).</summary>
    public async Task<ResourceAuthorization> AuthorizeReportAsync(Report report, AccessLevel required)
    {
        var level = await permissions.LevelForReportAsync(report.Id, report.FolderId, report.InheritsPermissions);
        if (!ReportVisibility.IsVisibleAtLevel(report, level)) return ResourceAuthorization.NotFound;
        return new ResourceAuthorization(level < required ? AccessOutcome.Forbidden : AccessOutcome.Allowed, level);
    }

    /// <summary>The caller's effective level on a report, with no gating — for stamping onto a summary DTO after the action is authorized.</summary>
    public Task<AccessLevel> LevelForReportAsync(Report report) =>
        permissions.LevelForReportAsync(report.Id, report.FolderId, report.InheritsPermissions);

    // --- folders ----------------------------------------------------------

    public async Task<ResourceAuthorization> AuthorizeFolderAsync(int folderId, AccessLevel required)
    {
        if (!await db.Folders.AnyAsync(f => f.Id == folderId)) return ResourceAuthorization.NotFound;
        var level = await permissions.LevelForFolderAsync(folderId);
        if (level < AccessLevel.Viewer) return ResourceAuthorization.NotFound; // hidden
        return new ResourceAuthorization(level < required ? AccessOutcome.Forbidden : AccessOutcome.Allowed, level);
    }

    /// <summary>Creating an item inside a folder (or at the root when null) needs Editor on that container.</summary>
    public async Task<ResourceAuthorization> AuthorizeCreateInAsync(int? folderId)
    {
        var level = folderId is { } id ? await permissions.LevelForFolderAsync(id) : await permissions.LevelForRootAsync();
        // A missing/invisible container is masked as 404; a visible one below Editor is 403.
        if (folderId is not null && level < AccessLevel.Viewer) return ResourceAuthorization.NotFound;
        return new ResourceAuthorization(level < AccessLevel.Editor ? AccessOutcome.Forbidden : AccessOutcome.Allowed, level);
    }

    // --- datasets ---------------------------------------------------------

    /// <summary>
    /// Authorizes an action on a dataset against the report that owns it: hidden/missing ⇒ NotFound,
    /// below <paramref name="required"/> ⇒ Forbidden, and a <paramref name="mutation"/> against a
    /// published version's immutable data ⇒ ReadOnly.
    /// </summary>
    public async Task<ResourceAuthorization> AuthorizeDatasetAsync(int datasetId, AccessLevel required, bool mutation)
    {
        var owner = await datasets.GetOwnerAsync(datasetId);
        if (owner is null) return ResourceAuthorization.NotFound;

        var level = await permissions.LevelForReportAsync(owner.ReportId, owner.FolderId, owner.InheritsPermissions);
        if (level < AccessLevel.Viewer) return ResourceAuthorization.NotFound;
        if (level < required) return new ResourceAuthorization(AccessOutcome.Forbidden, level);
        if (mutation && !owner.IsDraft) return new ResourceAuthorization(AccessOutcome.ReadOnly, level);
        return new ResourceAuthorization(AccessOutcome.Allowed, level);
    }

    // --- list visibility --------------------------------------------------

    /// <summary>
    /// Keeps only the reports the caller can see, projecting each survivor with the caller's effective
    /// level (and stopping once <paramref name="take"/> survivors are found, if given). The single home
    /// for the "filter a report list to what's visible" loop the listings and personalization share.
    /// </summary>
    public async Task<List<T>> FilterVisibleReportsAsync<T>(
        IEnumerable<Report> reports, Func<Report, AccessLevel, T> project, int? take = null)
    {
        var visible = new List<T>();
        foreach (var report in reports)
        {
            var level = await permissions.LevelForReportAsync(report.Id, report.FolderId, report.InheritsPermissions);
            if (!ReportVisibility.IsVisibleAtLevel(report, level)) continue;
            visible.Add(project(report, level));
            if (take is { } t && visible.Count >= t) break;
        }
        return visible;
    }

    /// <summary>Whether the caller can see a folder at all (≥ Viewer). The folder listings filter their DTOs through this.</summary>
    public async Task<bool> CanSeeFolderAsync(int folderId) =>
        await permissions.LevelForFolderAsync(folderId) >= AccessLevel.Viewer;
}
