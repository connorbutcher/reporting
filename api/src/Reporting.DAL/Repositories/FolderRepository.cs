using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>All querying and persistence for the folder tree.</summary>
public class FolderRepository(ReportingDbContext db)
{
    public async Task<List<FolderDto>> GetAllAsync()
    {
        var folders = await db.Folders.Include(f => f.ParentFolder).ToListAsync();
        return folders.Select(f => f.ToDto()).ToList();
    }

    /// <summary>Direct children of <paramref name="parentRef"/> (root if null), each flagged with whether it has children of its own — enough for the tree to draw an expand arrow without fetching further.</summary>
    public async Task<List<FolderDto>> GetChildrenAsync(Guid? parentRef)
    {
        int? parentPk = null;
        if (parentRef is { } pref)
        {
            parentPk = await db.Folders.Where(f => f.RefId == pref).Select(f => (int?)f.Id).FirstOrDefaultAsync();
            if (parentPk is null) return [];
        }

        var children = await db.Folders
            .Include(f => f.ParentFolder)
            .Where(f => f.ParentFolderId == parentPk)
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

    /// <summary>The chain of ancestors from the root down to <paramref name="id"/>, for building a breadcrumb without the whole tree. Null if <paramref name="id"/> doesn't exist.</summary>
    public async Task<List<FolderDto>?> GetPathAsync(Guid id)
    {
        var allFolders = await db.Folders.Include(f => f.ParentFolder).ToListAsync();
        var byId = allFolders.ToDictionary(f => f.Id);
        var start = allFolders.FirstOrDefault(f => f.RefId == id);
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

    /// <summary>Throws <see cref="DataValidationException"/> if the parent folder doesn't exist.</summary>
    public async Task<FolderDto> CreateAsync(string name, Guid? parentRef)
    {
        Folder? parent = null;
        if (parentRef is { } pref)
        {
            parent = await db.Folders.FirstOrDefaultAsync(f => f.RefId == pref)
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
    /// Null if <paramref name="id"/> doesn't exist. Throws <see cref="DataValidationException"/>
    /// if the new parent doesn't exist or would move the folder into its own subtree.
    /// </summary>
    public async Task<FolderDto?> UpdateAsync(Guid id, string name, Guid? parentRef)
    {
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.RefId == id);
        if (folder is null) return null;

        Folder? parent = null;
        if (parentRef is { } pref)
        {
            parent = await db.Folders.FirstOrDefaultAsync(f => f.RefId == pref)
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
                cursor = cursor.ParentFolderId is { } pid
                    ? await db.Folders.FirstOrDefaultAsync(f => f.Id == pid)
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
    public async Task<bool> DeleteAsync(Guid id)
    {
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.RefId == id);
        if (folder is null) return false;

        var hasChildFolders = await db.Folders.AnyAsync(f => f.ParentFolderId == folder.Id);
        var hasReports = await db.Reports.AnyAsync(r => r.FolderId == folder.Id);
        if (hasChildFolders || hasReports) throw new DataConflictException("Folder is not empty.");

        db.Folders.Remove(folder);
        await db.SaveChangesAsync();
        return true;
    }
}
