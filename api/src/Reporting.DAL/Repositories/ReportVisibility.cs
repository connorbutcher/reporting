using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>Shared rule for whether a report should appear to a caller at a given access level.</summary>
public static class ReportVisibility
{
    /// <summary>
    /// Below <see cref="AccessLevel.Viewer"/> a report is hidden outright. A caller who can't edit is
    /// additionally kept from ever seeing a report with no published version — a draft-only report is
    /// invisible to them, so they only learn a report exists once there's a published version to open.
    /// Assumes <see cref="Report.Revisions"/> is loaded.
    /// </summary>
    public static bool IsVisibleAtLevel(Report report, AccessLevel level) =>
        level >= AccessLevel.Viewer &&
        (level >= AccessLevel.Editor || report.LatestPublishedVersionNumber() is not null);
}
