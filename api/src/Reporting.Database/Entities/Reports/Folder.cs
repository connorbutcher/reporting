namespace Reporting.Database;

public class Folder
{
    public int Id { get; set; }

    public Guid RefId { get; set; }

    public string Name { get; set; } = string.Empty;
    public int? ParentFolderId { get; set; }
    public Folder? ParentFolder { get; set; }

    /// <summary>False cuts the inheritance chain so only this folder's own grants apply.</summary>
    public bool InheritsPermissions { get; set; } = true;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
