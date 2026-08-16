namespace Reporting.Database;

public class Folder
{
    public int Id { get; set; }

    /// <summary>Stable external/reference id, exposed through the API and used in cross-references.</summary>
    public Guid RefId { get; set; }

    public string Name { get; set; } = string.Empty;
    public int? ParentFolderId { get; set; }
    public Folder? ParentFolder { get; set; }

    /// <summary>
    /// When true (the default) this folder's access is its own grants layered on top of
    /// its parent's — or the open root baseline for a top-level folder. When false the
    /// chain is cut here: only this folder's own grants apply, so it can be made more
    /// restrictive than its parent.
    /// </summary>
    public bool InheritsPermissions { get; set; } = true;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
