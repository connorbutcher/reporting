using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.Api.Authorization;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

/// <summary>A report's viewing filters: the current user's saved ones, and snapshots shared by short id.</summary>
[ApiController]
[Route("api/reports/{reportId:int}")]
public class ReportViewFiltersController(
    ReportViewStateService viewStates,
    ReportSharedViewService sharedViews) : ControllerBase
{
    /// <summary><c>Filters</c> is null when the user has none saved.</summary>
    [HttpGet("view-filters")]
    [AuthorizeReport(AccessLevel.Viewer)]
    public async Task<ActionResult<ReportViewFiltersDto>> GetSaved(int reportId) =>
        new ReportViewFiltersDto { Filters = await viewStates.GetAsync(reportId) };

    [HttpPut("view-filters")]
    [AuthorizeReport(AccessLevel.Viewer)]
    public async Task<IActionResult> Save(int reportId, SaveReportViewFiltersDto dto)
    {
        await viewStates.SaveAsync(reportId, dto.Filters);
        return NoContent();
    }

    /// <summary>Unguarded, like un-starring: a user can always remove their own data.</summary>
    [HttpDelete("view-filters")]
    public async Task<IActionResult> Clear(int reportId)
    {
        await viewStates.ClearAsync(reportId);
        return NoContent();
    }

    /// <summary>The short id for these filters; the same one if they were shared before.</summary>
    [HttpPost("shared-views")]
    [AuthorizeReport(AccessLevel.Viewer)]
    public async Task<ActionResult<ReportSharedViewDto>> Share(int reportId, SaveReportViewFiltersDto dto) =>
        await sharedViews.CreateAsync(reportId, dto.Filters);

    /// <summary><c>Filters</c> is null when this report has no snapshot with that id.</summary>
    [HttpGet("shared-views/{viewId}")]
    [AuthorizeReport(AccessLevel.Viewer)]
    public async Task<ActionResult<ReportSharedViewDto>> GetShared(int reportId, string viewId) =>
        await sharedViews.GetAsync(reportId, viewId);
}
