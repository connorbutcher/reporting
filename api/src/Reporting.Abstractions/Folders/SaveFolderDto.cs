namespace Reporting.Abstractions;

public class SaveFolderDto
{
    public string Name { get; set; } = string.Empty;
    public int? ParentFolderId { get; set; }
}
