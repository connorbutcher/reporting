namespace Reporting.DAL.Repositories;

/// <summary>The draft revision of a report plus the report's permission context, for scoping dataset list/create.</summary>
public sealed record ReportDraftContext(int RevisionId, int? FolderId, bool InheritsPermissions);
