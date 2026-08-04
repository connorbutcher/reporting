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

    [HttpPost]
    public async Task<ActionResult<FolderDto>> Create(SaveFolderDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A folder needs a name.");

        if (dto.ParentFolderId is { } parentId && !await _db.Folders.AnyAsync(f => f.Id == parentId))
        {
            return BadRequest("Parent folder does not exist.");
        }

        var folder = new Folder
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            ParentFolderId = dto.ParentFolderId,
            CreatedAt = DateTime.UtcNow,
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

        if (dto.ParentFolderId == id) return BadRequest("A folder cannot be its own parent.");
        if (dto.ParentFolderId is { } parentId && !await _db.Folders.AnyAsync(f => f.Id == parentId))
        {
            return BadRequest("Parent folder does not exist.");
        }

        folder.Name = dto.Name.Trim();
        folder.ParentFolderId = dto.ParentFolderId;
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
