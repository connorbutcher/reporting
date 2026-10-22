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

    /// <summary>Visible direct children of <paramref name="parentId"/> (root if omitted), each flagged with whether it has children.</summary>
    [HttpGet("children")]
    public async Task<ActionResult<List<FolderDto>>> GetChildren([FromQuery] int? parentId)
    {
        var children = await folders.GetChildrenAsync(parentId);
        return await WhereVisibleAsync(children);
    }

    /// <summary>Ancestors from the root down to <paramref name="id"/>, for a breadcrumb.</summary>
    [HttpGet("{id:int}/path")]
    [AuthorizeFolder(AccessLevel.Viewer)]
    public async Task<ActionResult<List<FolderDto>>> GetPath(int id)
    {
        var path = await folders.GetPathAsync(id);
        return path is null ? NotFound() : path;
    }

    /// <summary>
    /// Without <paramref name="excludeId"/> this is a create check (Editor on the parent); with one it's a
    /// rename check (Manager on that folder), matching the actions it precedes.
    /// </summary>
    [HttpGet("name-available")]
    public async Task<ActionResult<FolderNameAvailableDto>> NameAvailable(
        [FromQuery] string name, [FromQuery] int? parentFolderId, [FromQuery] int? excludeId)
    {
        var auth = excludeId is { } id
            ? await authorizer.AuthorizeFolderAsync(id, AccessLevel.Manager)
            : await authorizer.AuthorizeCreateInAsync(parentFolderId);
        if (!auth.Allowed)
        {
            return this.ToActionResult(auth, excludeId is null ? AccessLevel.Editor : AccessLevel.Manager);
        }

        return new FolderNameAvailableDto
        {
            Available = await folders.NameAvailableAsync(name, parentFolderId, excludeId)
        };
    }

    [HttpPost]
    public async Task<ActionResult<FolderDto>> Create(SaveFolderDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("A folder needs a name.");
        }

        var createAuth = await authorizer.AuthorizeCreateInAsync(dto.ParentFolderId);
        if (!createAuth.Allowed)
        {
            return this.ToActionResult(createAuth, AccessLevel.Editor);
        }

        var folder = await folders.CreateAsync(dto.Name.Trim(), dto.ParentFolderId);
        return CreatedAtAction(nameof(GetAll), folder);
    }

    [HttpPut("{id:int}")]
    [AuthorizeFolder(AccessLevel.Manager)]
    public async Task<ActionResult<FolderDto>> Update(int id, SaveFolderDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("A folder needs a name.");
        }

        // Moving into a different container also needs Editor on the destination.
        var currentParentId = await folders.GetParentFolderIdAsync(id);
        if (currentParentId != dto.ParentFolderId)
        {
            var moveAuth = await authorizer.AuthorizeCreateInAsync(dto.ParentFolderId);
            if (!moveAuth.Allowed)
            {
                return this.ToActionResult(moveAuth, AccessLevel.Editor);
            }
        }

        var folder = await folders.UpdateAsync(id, dto.Name.Trim(), dto.ParentFolderId);
        return folder is null ? NotFound() : folder;
    }

    [HttpDelete("{id:int}")]
    [AuthorizeFolder(AccessLevel.Manager)]
    public async Task<IActionResult> Delete(int id)
    {
        return await folders.DeleteAsync(id) ? NoContent() : NotFound();
    }

    private async Task<List<FolderDto>> WhereVisibleAsync(IEnumerable<FolderDto> folders)
    {
        var visible = new List<FolderDto>();
        foreach (var folder in folders)
        {
            if (await authorizer.CanSeeFolderAsync(folder.Id))
            {
                visible.Add(folder);
            }
        }

        return visible;
    }
}
