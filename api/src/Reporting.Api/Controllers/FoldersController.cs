using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.Api.Authorization;
using Reporting.DAL.Permissions;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FoldersController(FolderRepository folders, ResourceAuthorizer authorizer) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<FolderDto>>> GetAll()
    {
        var all = await folders.GetAllAsync();
        return await WhereVisibleAsync(all);
    }

    /// <summary>Direct child folders of <paramref name="parentId"/> (root if omitted) the caller can see, each flagged with whether it has children of its own — enough for the tree to draw an expand arrow without fetching further.</summary>
    [HttpGet("children")]
    public async Task<ActionResult<List<FolderDto>>> GetChildren([FromQuery] int? parentId)
    {
        var children = await folders.GetChildrenAsync(parentId);
        return await WhereVisibleAsync(children);
    }

    /// <summary>The chain of ancestors from the root down to <paramref name="id"/>, for building a breadcrumb without the whole tree.</summary>
    [HttpGet("{id:int}/path")]
    [AuthorizeFolder(AccessLevel.Viewer)]
    public async Task<ActionResult<List<FolderDto>>> GetPath(int id)
    {
        var path = await folders.GetPathAsync(id);
        return path is null ? NotFound() : path;
    }

    [HttpPost]
    public async Task<ActionResult<FolderDto>> Create(SaveFolderDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A folder needs a name.");

        // Creating a subfolder is an Editor action on the containing folder (or the root).
        var createAuth = await authorizer.AuthorizeCreateInAsync(dto.ParentFolderId);
        if (!createAuth.Allowed) return this.ToActionResult(createAuth, AccessLevel.Editor);

        try
        {
            var folder = await folders.CreateAsync(dto.Name.Trim(), dto.ParentFolderId);
            return CreatedAtAction(nameof(GetAll), folder);
        }
        catch (DataValidationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id:int}")]
    [AuthorizeFolder(AccessLevel.Manager)]
    public async Task<ActionResult<FolderDto>> Update(int id, SaveFolderDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A folder needs a name.");

        // Moving into a different container also needs Editor on the destination.
        var currentParentId = await folders.GetParentFolderIdAsync(id);
        if (currentParentId != dto.ParentFolderId)
        {
            var moveAuth = await authorizer.AuthorizeCreateInAsync(dto.ParentFolderId);
            if (!moveAuth.Allowed) return this.ToActionResult(moveAuth, AccessLevel.Editor);
        }

        try
        {
            var folder = await folders.UpdateAsync(id, dto.Name.Trim(), dto.ParentFolderId);
            return folder is null ? NotFound() : folder;
        }
        catch (DataValidationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id:int}")]
    [AuthorizeFolder(AccessLevel.Manager)]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            return await folders.DeleteAsync(id) ? NoContent() : NotFound();
        }
        catch (DataConflictException ex)
        {
            return Conflict(ex.Message);
        }
    }

    /// <summary>Keeps only the folders the caller can see (≥ Viewer).</summary>
    private async Task<List<FolderDto>> WhereVisibleAsync(IEnumerable<FolderDto> folders)
    {
        var visible = new List<FolderDto>();
        foreach (var folder in folders)
            if (await authorizer.CanSeeFolderAsync(folder.Id)) visible.Add(folder);
        return visible;
    }
}
