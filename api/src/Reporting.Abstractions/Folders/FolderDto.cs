namespace Reporting.Abstractions;

public class FolderDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? ParentFolderId { get; set; }
    public DateTime ModifiedAt { get; set; }

    /// <summary>Only populated by the children endpoint.</summary>
    public bool HasChildren { get; set; }
}
