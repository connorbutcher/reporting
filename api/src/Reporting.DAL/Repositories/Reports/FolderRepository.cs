using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>Querying and persistence for the folder tree. Makes no authorization decisions: the controller does.</summary>
public class FolderRepository(ReportingDbContext db)
{
    public async Task<List<FolderDto>> GetAllAsync()
    {
        var folders = await db.Folders.ToListAsync();
        return folders.Select(f => f.ToDto()).ToList();
    }

    /// <summary>Root if <paramref name="parentId"/> is null. Each is flagged with whether it has children.</summary>
    public async Task<List<FolderDto>> GetChildrenAsync(int? parentId)
    {
        if (parentId is { } pid && !await db.Folders.AnyAsync(f => f.Id == pid))
        {
            return [];
        }

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
    /// Root down to <paramref name="id"/>, or null if it doesn't exist. Ancestors appear as name-only
    /// segments even where the caller can't open them.
    /// </summary>
    public async Task<List<FolderDto>?> GetPathAsync(int id)
    {
        var allFolders = await db.Folders.ToListAsync();
        var byId = allFolders.ToDictionary(f => f.Id);
        var start = allFolders.FirstOrDefault(f => f.Id == id);
        if (start is null)
        {
            return null;
        }

        var path = new List<FolderDto>();
        var current = (Folder?)start;
        while (current is not null)
        {
            path.Insert(0, current.ToDto());
            current = current.ParentFolderId is { } pid ? byId.GetValueOrDefault(pid) : null;
        }
        return path;
    }

    /// <summary>Null at the root. Assumes the folder exists.</summary>
    public async Task<int?> GetParentFolderIdAsync(int id)
    {
        return await db.Folders.Where(f => f.Id == id).Select(f => f.ParentFolderId).FirstOrDefaultAsync();
    }

    /// <summary>
    /// Checked against every sibling, visible or not, since a subfolder's own ACL can hide it from a
    /// parent's editor. Only answers yes/no, so it can't enumerate hidden names.
    /// </summary>
    public async Task<bool> NameAvailableAsync(string? name, int? parentId, int? excludeId = null)
    {
        var trimmed = (name ?? string.Empty).Trim();
        if (trimmed.Length == 0)
        {
            return true;
        }

        return !await db.Folders.AnyAsync(f => f.ParentFolderId == parentId && f.Name == trimmed && f.Id != excludeId);
    }

    /// <summary>Throws <see cref="DataValidationException"/> if the parent doesn't exist.</summary>
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
    /// Null if <paramref name="id"/> doesn't exist. Throws <see cref="DataValidationException"/> if the new
    /// parent doesn't exist or is inside the folder's own subtree.
    /// </summary>
    public async Task<FolderDto?> UpdateAsync(int id, string name, int? parentId)
    {
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == id);
        if (folder is null)
        {
            return null;
        }

        Folder? parent = null;
        if (parentId is { } pid)
        {
            parent = await db.Folders.FirstOrDefaultAsync(f => f.Id == pid)
                ?? throw new DataValidationException("Parent folder does not exist.");

            // Walking the new parent's ancestors catches a move into any descendant, not just itself.
            var cursor = (Folder?)parent;
            var visited = new HashSet<int>();
            while (cursor is not null)
            {
                if (cursor.Id == folder.Id)
                {
                    throw new DataValidationException("Cannot move a folder into its own subtree.");
                }

                if (!visited.Add(cursor.Id))
                {
                    break;
                }

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
        if (folder is null)
        {
            return false;
        }

        var hasChildFolders = await db.Folders.AnyAsync(f => f.ParentFolderId == folder.Id);
        var hasReports = await db.Reports.AnyAsync(r => r.FolderId == folder.Id);
        if (hasChildFolders || hasReports)
        {
            throw new DataConflictException("Folder is not empty.");
        }

        db.Folders.Remove(folder);
        await db.SaveChangesAsync();
        return true;
    }
}
