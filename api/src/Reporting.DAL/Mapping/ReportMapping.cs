using System.Text.Json;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL;

public static class ReportMapping
{
    public static FolderDto ToDto(this Folder folder)
    {
        return new()
        {
            Id = folder.Id,
            Name = folder.Name,
            ParentFolderId = folder.ParentFolderId,
            ModifiedAt = folder.UpdatedAt
        };
    }

    /// <summary>
    /// Assumes <see cref="Report.Revisions"/> is loaded. <paramref name="level"/> is the calling user's
    /// effective access: it gates <see cref="ReportSummaryDto.HasDraft"/> so only an editor learns a draft
    /// exists. <paramref name="isFavorite"/> is whether the caller has starred the report.
    /// </summary>
    public static ReportSummaryDto ToSummaryDto(this Report report, AccessLevel level, bool isFavorite)
    {
        return new()
        {
            Id = report.Id,
            Number = report.Number,
            Name = report.Name,
            FolderId = report.FolderId,
            HasDraft = level >= AccessLevel.Editor && report.Revisions.Any(r => r.Kind == RevisionKind.Draft),
            LatestVersionNumber = report.LatestPublishedVersionNumber(),
            AccessLevel = level,
            IsFavorite = isFavorite,
            ModifiedAt = report.UpdatedAt
        };
    }

    /// <summary>Assumes <see cref="Report.Revisions"/> is loaded. See <see cref="ToSummaryDto"/> for the parameters.</summary>
    public static ReportSearchResultDto ToSearchResultDto(this Report report, string folderPath, AccessLevel level, bool isFavorite)
    {
        return new()
        {
            Id = report.Id,
            Number = report.Number,
            Name = report.Name,
            HasDraft = level >= AccessLevel.Editor && report.Revisions.Any(r => r.Kind == RevisionKind.Draft),
            LatestVersionNumber = report.LatestPublishedVersionNumber(),
            AccessLevel = level,
            IsFavorite = isFavorite,
            ModifiedAt = report.UpdatedAt,
            FolderPath = folderPath
        };
    }

    /// <summary>The highest published version number, or null if the report has never been published.</summary>
    public static int? LatestPublishedVersionNumber(this Report report)
    {
        return report.Revisions
            .Where(r => r.Kind == RevisionKind.Published)
            .Select(r => r.VersionNumber)
            .DefaultIfEmpty(null)
            .Max();
    }

    public static ReportRevisionDto ToContentDto(this ReportRevision revision, Report report)
    {
        return new()
        {
            ReportId = report.Id,
            Name = report.Name,
            Tabs = revision.Tabs.OrderBy(t => t.Order).Select(t => t.ToDto()).ToList(),
            Notes = revision.Notes,
            Filters = revision.GetFilters()
        };
    }

    public static List<ReportFilterDto> GetFilters(this ReportRevision revision)
    {
        // A blank blob predates filters; a malformed one shouldn't take the report down.
        if (string.IsNullOrWhiteSpace(revision.FiltersJson))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<List<ReportFilterDto>>(revision.FiltersJson, ConfigJson.Options) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    public static void SetFilters(this ReportRevision revision, List<ReportFilterDto> filters)
    {
        revision.FiltersJson = JsonSerializer.Serialize(filters, ConfigJson.Options);
    }

    public static ReportVersionSummaryDto ToVersionSummaryDto(this ReportRevision revision)
    {
        return new()
        {
            VersionNumber = revision.VersionNumber!.Value,
            PublishedAt = revision.PublishedAt!.Value,
            Notes = revision.Notes
        };
    }
}
