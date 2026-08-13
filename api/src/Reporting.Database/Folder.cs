namespace Reporting.Database;

public class Folder
{
    public int Id { get; set; }

    /// <summary>Stable external/reference id, exposed through the API and used in cross-references.</summary>
    public Guid RefId { get; set; }

    public string Name { get; set; } = string.Empty;
    public int? ParentFolderId { get; set; }
    public Folder? ParentFolder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
