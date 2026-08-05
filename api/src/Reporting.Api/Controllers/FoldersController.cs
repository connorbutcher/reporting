using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Reporting.Api.Contracts;
using Reporting.Api.Data;
using Reporting.Api.Domain;

namespace Reporting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FoldersController : ControllerBase
{
    private readonly ReportingDbContext _db;

    public FoldersController(ReportingDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<FolderDto>>> GetAll()
    {
        var folders = await _db.Folders.ToListAsync();
        return folders.Select(f => f.ToDto()).ToList();
    }

    /// <summary>Direct child folders of <paramref name="parentId"/> (root if omitted), each flagged with whether it has children of its own — enough for the tree to draw an expand arrow without fetching further.</summary>
    [HttpGet("children")]
    public async Task<ActionResult<List<FolderDto>>> GetChildren([FromQuery] Guid? parentId)
    {
        var children = await _db.Folders
            .Where(f => f.ParentFolderId == parentId)
            .OrderBy(f => f.Name)
            .ToListAsync();

        var result = new List<FolderDto>(children.Count);
        foreach (var folder in children)
        {
            var dto = folder.ToDto();
            dto.HasChildren = await _db.Folders.AnyAsync(f => f.ParentFolderId == folder.Id);
            result.Add(dto);
        }
        return result;
    }

    /// <summary>The chain of ancestors from the root down to <paramref name="id"/>, for building a breadcrumb without the whole tree.</summary>
    [HttpGet("{id:guid}/path")]
    public async Task<ActionResult<List<FolderDto>>> GetPath(Guid id)
    {
        var allFolders = await _db.Folders.ToListAsync();
        var byId = allFolders.ToDictionary(f => f.Id);
        if (!byId.ContainsKey(id)) return NotFound();

        var path = new List<FolderDto>();
        Guid? current = id;
        while (current is { } cid && byId.TryGetValue(cid, out var folder))
        {
            path.Insert(0, folder.ToDto());
            current = folder.ParentFolderId;
        }
        return path;
    }

    [HttpPost]
    public async Task<ActionResult<FolderDto>> Create(SaveFolderDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A folder needs a name.");

        if (dto.ParentFolderId is { } parentId && !await _db.Folders.AnyAsync(f => f.Id == parentId))
        {
            return BadRequest("Parent folder does not exist.");
        }

        var now = DateTime.UtcNow;
        var folder = new Folder
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            ParentFolderId = dto.ParentFolderId,
            CreatedAt = now,
            UpdatedAt = now,
        };

        _db.Folders.Add(folder);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), folder.ToDto());
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<FolderDto>> Update(Guid id, SaveFolderDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A folder needs a name.");

        var folder = await _db.Folders.FirstOrDefaultAsync(f => f.Id == id);
        if (folder is null) return NotFound();

        if (dto.ParentFolderId is { } parentId)
        {
            // Walking the new parent's own ancestor chain catches not just a direct
            // self-parent but moving a folder into any of its own descendants, which
            // would otherwise splice a cycle into the tree.
            var cursor = await _db.Folders.FirstOrDefaultAsync(f => f.Id == parentId);
            if (cursor is null) return BadRequest("Parent folder does not exist.");

            var visited = new HashSet<Guid>();
            while (cursor is not null)
            {
                if (cursor.Id == id) return BadRequest("Cannot move a folder into its own subtree.");
                if (!visited.Add(cursor.Id)) break;
                cursor = cursor.ParentFolderId is { } pid
                    ? await _db.Folders.FirstOrDefaultAsync(f => f.Id == pid)
                    : null;
            }
        }

        folder.Name = dto.Name.Trim();
        folder.ParentFolderId = dto.ParentFolderId;
        folder.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return folder.ToDto();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var folder = await _db.Folders.FirstOrDefaultAsync(f => f.Id == id);
        if (folder is null) return NotFound();

        var hasChildFolders = await _db.Folders.AnyAsync(f => f.ParentFolderId == id);
        var hasReports = await _db.Reports.AnyAsync(r => r.FolderId == id);
        if (hasChildFolders || hasReports) return Conflict("Folder is not empty.");

        _db.Folders.Remove(folder);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
