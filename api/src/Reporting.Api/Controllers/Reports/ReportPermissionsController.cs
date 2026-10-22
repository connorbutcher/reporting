using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.Api.Authorization;
using Reporting.DAL.Permissions;

namespace Reporting.Api.Controllers;

/// <summary>A report's own grants on top of what it inherits from its folder.</summary>
[ApiController]
[Route("api/reports/{reportId:int}/permissions")]
[AuthorizeReport(AccessLevel.Manager)]
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
    public async Task<IActionResult> SetInheritance(int reportId, SetInheritanceDto dto)
    {
        return await admin.SetReportInheritanceAsync(reportId, dto) ? NoContent() : NotFound();
    }

    [HttpPut]
    public async Task<ActionResult<AccessGrantDto>> Upsert(int reportId, SaveGrantDto dto)
    {
        var grant = await admin.UpsertReportGrantAsync(reportId, dto);
        return grant is null ? NotFound() : grant;
    }

    [HttpDelete]
    public async Task<IActionResult> Remove(int reportId, [FromBody] RemoveGrantDto dto)
    {
        return await admin.RemoveReportGrantAsync(reportId, dto) ? NoContent() : NotFound();
    }
}
