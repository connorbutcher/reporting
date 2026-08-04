namespace Reporting.Api.Contracts;

public class FolderDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid? ParentFolderId { get; set; }
}

public class SaveFolderDto
{
    public string Name { get; set; } = string.Empty;
    public Guid? ParentFolderId { get; set; }
}
