using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.Api.Authorization;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

/// <summary>Comments left on a widget while viewing a report. Posting is a viewer action, not an editor one.</summary>
[ApiController]
[Route("api/reports/{reportId:int}")]
public class WidgetCommentsController(WidgetCommentService comments) : ControllerBase
{
    [HttpGet("widgets/{widgetRefId:guid}/comments")]
    [AuthorizeReport(AccessLevel.Viewer)]
    public async Task<ActionResult<List<WidgetCommentDto>>> Get(int reportId, Guid widgetRefId)
    {
        return await comments.GetAsync(reportId, widgetRefId);
    }

    [HttpPost("widgets/{widgetRefId:guid}/comments")]
    [AuthorizeReport(AccessLevel.Viewer)]
    public async Task<ActionResult<WidgetCommentDto>> Create(int reportId, Guid widgetRefId, CreateWidgetCommentDto dto)
    {
        return await comments.CreateAsync(reportId, widgetRefId, dto);
    }

    [HttpDelete("widgets/{widgetRefId:guid}/comments/{commentId:int}")]
    [AuthorizeReport(AccessLevel.Viewer)]
    public async Task<IActionResult> Delete(int reportId, Guid widgetRefId, int commentId)
    {
        await comments.DeleteAsync(reportId, widgetRefId, commentId);
        return NoContent();
    }

    /// <summary>Every widget's count at once, so the grid doesn't fire one request per widget.</summary>
    [HttpGet("comment-counts")]
    [AuthorizeReport(AccessLevel.Viewer)]
    public async Task<ActionResult<Dictionary<Guid, int>>> GetCounts(int reportId)
    {
        return await comments.GetCountsAsync(reportId);
    }
}
