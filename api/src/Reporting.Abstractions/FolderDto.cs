namespace Reporting.Abstractions;

public class FolderDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? ParentFolderId { get; set; }
    public DateTime ModifiedAt { get; set; }

    /// <summary>Whether this folder has any child folders — only populated by the children/lazy-tree endpoint.</summary>
    public bool HasChildren { get; set; }
}

public class SaveFolderDto
{
    public string Name { get; set; } = string.Empty;
    public int? ParentFolderId { get; set; }
}
