namespace Reporting.DAL.Repositories;

/// <summary>Where a dataset sits in the permission tree, and whether it belongs to an editable draft.</summary>
public sealed record DatasetOwner(int ReportId, int? FolderId, bool InheritsPermissions, bool IsDraft);
