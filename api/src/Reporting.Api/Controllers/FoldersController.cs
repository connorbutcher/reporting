using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FoldersController(FolderRepository folders) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<FolderDto>>> GetAll() =>
        await folders.GetAllAsync();

    /// <summary>Direct child folders of <paramref name="parentId"/> (root if omitted), each flagged with whether it has children of its own — enough for the tree to draw an expand arrow without fetching further.</summary>
    [HttpGet("children")]
    public async Task<ActionResult<List<FolderDto>>> GetChildren([FromQuery] Guid? parentId) =>
        await folders.GetChildrenAsync(parentId);

    /// <summary>The chain of ancestors from the root down to <paramref name="id"/>, for building a breadcrumb without the whole tree.</summary>
    [HttpGet("{id:guid}/path")]
    public async Task<ActionResult<List<FolderDto>>> GetPath(Guid id)
    {
        var path = await folders.GetPathAsync(id);
        return path is null ? NotFound() : path;
    }

    [HttpPost]
    public async Task<ActionResult<FolderDto>> Create(SaveFolderDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A folder needs a name.");

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

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<FolderDto>> Update(Guid id, SaveFolderDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A folder needs a name.");

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

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
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
}
