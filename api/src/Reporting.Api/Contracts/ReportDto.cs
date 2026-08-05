using Reporting.Api.Domain;

namespace Reporting.Api.Contracts;

public class ReportSummaryDto
{
    public Guid Id { get; set; }
    public int Number { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid? FolderId { get; set; }
    public bool HasDraft { get; set; }
    public int? LatestVersionNumber { get; set; }
    public DateTime ModifiedAt { get; set; }
}

/// <summary>A report match from a name/number search, with its folder location for display.</summary>
public class ReportSearchResultDto
{
    public Guid Id { get; set; }
    public int Number { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool HasDraft { get; set; }
    public int? LatestVersionNumber { get; set; }
    public DateTime ModifiedAt { get; set; }
    public string FolderPath { get; set; } = string.Empty;
}

public class CreateReportDto
{
    public string Name { get; set; } = string.Empty;
    public Guid? FolderId { get; set; }
}

public class SaveReportDto
{
    public string Name { get; set; } = string.Empty;
    public Guid? FolderId { get; set; }
}

/// <summary>The content of one revision (draft or a specific published version) of a report.</summary>
public class ReportRevisionDto
{
    public Guid ReportId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Columns { get; set; } = 12;
    public int Rows { get; set; } = 10;
    public List<WidgetDto> Widgets { get; set; } = new();

    /// <summary>Rich-text (HTML) description of what changed. Null for drafts and unpublished content.</summary>
    public string? Notes { get; set; }
}

public class ReportVersionSummaryDto
{
    public int VersionNumber { get; set; }
    public DateTime PublishedAt { get; set; }
    public string? Notes { get; set; }
}

public class CheckoutDraftDto
{
    public int? FromVersionNumber { get; set; }
}

public class PublishDraftDto
{
    /// <summary>Rich-text (HTML) description of what changed, from the publish dialog's editor.</summary>
    public string? Notes { get; set; }
}

public class WidgetDto
{
    public Guid Id { get; set; }
    public WidgetType Type { get; set; }
    public int X { get; set; }
    public int Y { get; set; }
    public int W { get; set; }
    public int H { get; set; }
    public WidgetConfig Config { get; set; } = null!;
}
