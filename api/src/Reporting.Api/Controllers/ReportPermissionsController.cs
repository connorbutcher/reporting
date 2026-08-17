using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.DAL.Permissions;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

/// <summary>Manage the grants on a report — its own overrides on top of what it inherits from its folder.</summary>
[ApiController]
[Route("api/reports/{reportId:int}/permissions")]
public class ReportPermissionsController(PermissionAdminService admin) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PermissionsDto>> Get(int reportId)
    {
        var result = await admin.GetReportPermissionsAsync(reportId);
        return result is null ? NotFound() : result;
    }

    [HttpGet("audit")]
    public async Task<ActionResult<List<GrantAuditEntryDto>>> Audit(int reportId)
    {
        var result = await admin.GetReportAuditAsync(reportId);
        return result is null ? NotFound() : result;
    }

    [HttpPut("inheritance")]
    public async Task<IActionResult> SetInheritance(int reportId, SetInheritanceDto dto) =>
        await admin.SetReportInheritanceAsync(reportId, dto) ? NoContent() : NotFound();

    [HttpPut]
    public async Task<ActionResult<AccessGrantDto>> Upsert(int reportId, SaveGrantDto dto)
    {
        try
        {
            var grant = await admin.UpsertReportGrantAsync(reportId, dto);
            return grant is null ? NotFound() : grant;
        }
        catch (DataValidationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete]
    public async Task<IActionResult> Remove(int reportId, [FromBody] RemoveGrantDto dto)
    {
        try
        {
            return await admin.RemoveReportGrantAsync(reportId, dto) ? NoContent() : NotFound();
        }
        catch (DataValidationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
