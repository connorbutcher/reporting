using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// All querying and persistence for the folder tree. Pure data access: it makes no authorization
/// decisions — the controller filters listings to what the caller may see (via the
/// <see cref="Permissions.ResourceAuthorizer"/>) and gates mutations with an <c>[AuthorizeFolder]</c>
/// attribute or an imperative check. Read methods return every matching folder, shaped as a DTO.
/// </summary>
public class FolderRepository(ReportingDbContext db)
{
    /// <summary>Every folder, shaped as a DTO — unfiltered. The caller keeps only what the user may see.</summary>
    public async Task<List<FolderDto>> GetAllAsync()
    {
        var folders = await db.Folders.ToListAsync();
        return folders.Select(f => f.ToDto()).ToList();
    }

    /// <summary>Direct children of <paramref name="parentId"/> (root if null), each flagged with whether it has children of its own — enough for the tree to draw an expand arrow. Unfiltered.</summary>
    public async Task<List<FolderDto>> GetChildrenAsync(int? parentId)
    {
        if (parentId is { } pid && !await db.Folders.AnyAsync(f => f.Id == pid)) return [];

        var children = await db.Folders
            .Where(f => f.ParentFolderId == parentId)
            .OrderBy(f => f.Name)
            .ToListAsync();

        var result = new List<FolderDto>(children.Count);
        foreach (var folder in children)
        {
            var dto = folder.ToDto();
            dto.HasChildren = await db.Folders.AnyAsync(f => f.ParentFolderId == folder.Id);
            result.Add(dto);
        }
        return result;
    }

    /// <summary>
    /// The chain of ancestors from the root down to <paramref name="id"/>, for building a breadcrumb
    /// without the whole tree. Null if <paramref name="id"/> doesn't exist. The ancestors above the
    /// target are surfaced as name-only path segments even where the caller can't open them; the
    /// caller authorizes visibility of the target itself.
    /// </summary>
    public async Task<List<FolderDto>?> GetPathAsync(int id)
    {
        var allFolders = await db.Folders.ToListAsync();
        var byId = allFolders.ToDictionary(f => f.Id);
        var start = allFolders.FirstOrDefault(f => f.Id == id);
        if (start is null) return null;

        var path = new List<FolderDto>();
        var current = (Folder?)start;
        while (current is not null)
        {
            path.Insert(0, current.ToDto());
            current = current.ParentFolderId is { } pid ? byId.GetValueOrDefault(pid) : null;
        }
        return path;
    }

    /// <summary>The current parent of a folder (null if it sits at the root), for deciding whether an update is a move. Assumes the folder exists.</summary>
    public async Task<int?> GetParentFolderIdAsync(int id) =>
        await db.Folders.Where(f => f.Id == id).Select(f => f.ParentFolderId).FirstOrDefaultAsync();

    /// <summary>
    /// Creates a subfolder. The caller authorizes the create (Editor on the container) first; this
    /// throws <see cref="DataValidationException"/> only if the parent folder doesn't exist.
    /// </summary>
    public async Task<FolderDto> CreateAsync(string name, int? parentId)
    {
        Folder? parent = null;
        if (parentId is { } pid)
        {
            parent = await db.Folders.FirstOrDefaultAsync(f => f.Id == pid)
                ?? throw new DataValidationException("Parent folder does not exist.");
        }

        var now = DateTime.UtcNow;
        var folder = new Folder
        {
            RefId = Guid.NewGuid(),
            Name = name,
            ParentFolder = parent,
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.Folders.Add(folder);
        await db.SaveChangesAsync();
        return folder.ToDto();
    }

    /// <summary>
    /// Renames/moves a folder. The caller authorizes it (Manager on the folder, Editor on the
    /// destination when moved) first. Null if <paramref name="id"/> doesn't exist; throws
    /// <see cref="DataValidationException"/> if the new parent doesn't exist or would move the folder
    /// into its own subtree.
    /// </summary>
    public async Task<FolderDto?> UpdateAsync(int id, string name, int? parentId)
    {
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == id);
        if (folder is null) return null;

        Folder? parent = null;
        if (parentId is { } pid)
        {
            parent = await db.Folders.FirstOrDefaultAsync(f => f.Id == pid)
                ?? throw new DataValidationException("Parent folder does not exist.");

            // Walking the new parent's own ancestor chain catches not just a direct
            // self-parent but moving a folder into any of its own descendants, which
            // would otherwise splice a cycle into the tree.
            var cursor = (Folder?)parent;
            var visited = new HashSet<int>();
            while (cursor is not null)
            {
                if (cursor.Id == folder.Id) throw new DataValidationException("Cannot move a folder into its own subtree.");
                if (!visited.Add(cursor.Id)) break;
                cursor = cursor.ParentFolderId is { } ancestorId
                    ? await db.Folders.FirstOrDefaultAsync(f => f.Id == ancestorId)
                    : null;
            }
        }

        folder.Name = name;
        folder.ParentFolder = parent;
        folder.ParentFolderId = parent?.Id;
        folder.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return folder.ToDto();
    }

    /// <summary>False if <paramref name="id"/> doesn't exist. Throws <see cref="DataConflictException"/> if the folder still has contents.</summary>
    public async Task<bool> DeleteAsync(int id)
    {
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == id);
        if (folder is null) return false;

        var hasChildFolders = await db.Folders.AnyAsync(f => f.ParentFolderId == folder.Id);
        var hasReports = await db.Reports.AnyAsync(r => r.FolderId == folder.Id);
        if (hasChildFolders || hasReports) throw new DataConflictException("Folder is not empty.");

        db.Folders.Remove(folder);
        await db.SaveChangesAsync();
        return true;
    }
}
