namespace Reporting.DAL.Permissions;

internal sealed record FolderRow(int? ParentFolderId, bool Inherits);
