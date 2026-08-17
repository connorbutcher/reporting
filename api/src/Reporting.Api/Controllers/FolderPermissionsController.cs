using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.DAL.Permissions;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

/// <summary>Manage the grants on a folder. Every action needs Manager on the folder (an invisible one 404s).</summary>
[ApiController]
[Route("api/folders/{folderId:int}/permissions")]
public class FolderPermissionsController(PermissionAdminService admin) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PermissionsDto>> Get(int folderId)
    {
        var result = await admin.GetFolderPermissionsAsync(folderId);
        return result is null ? NotFound() : result;
    }

    [HttpGet("audit")]
    public async Task<ActionResult<List<GrantAuditEntryDto>>> Audit(int folderId)
    {
        var result = await admin.GetFolderAuditAsync(folderId);
        return result is null ? NotFound() : result;
    }

    [HttpPut("inheritance")]
    public async Task<IActionResult> SetInheritance(int folderId, SetInheritanceDto dto) =>
        await admin.SetFolderInheritanceAsync(folderId, dto) ? NoContent() : NotFound();

    [HttpPut]
    public async Task<ActionResult<AccessGrantDto>> Upsert(int folderId, SaveGrantDto dto)
    {
        try
        {
            var grant = await admin.UpsertFolderGrantAsync(folderId, dto);
            return grant is null ? NotFound() : grant;
        }
        catch (DataValidationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete]
    public async Task<IActionResult> Remove(int folderId, [FromBody] RemoveGrantDto dto)
    {
        try
        {
            return await admin.RemoveFolderGrantAsync(folderId, dto) ? NoContent() : NotFound();
        }
        catch (DataValidationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
