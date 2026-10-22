using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.Api.Authorization;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

/// <summary>
/// Comments engineers leave on a widget while viewing a report, and the published report's own
/// comment counts for the viewer's footer pills. Gated at Viewer, like the rest of the viewer's own
/// data (saved filters, shared views) — posting a comment is a viewer action, not an editor one.
/// </summary>
[ApiController]
[Route("api/reports/{reportId:int}")]
public class WidgetCommentsController(WidgetCommentService comments) : ControllerBase
{
    [HttpGet("widgets/{widgetRefId:guid}/comments")]
    [AuthorizeReport(AccessLevel.Viewer)]
    public async Task<ActionResult<List<WidgetCommentDto>>> Get(int reportId, Guid widgetRefId) =>
        await comments.GetAsync(reportId, widgetRefId);

    [HttpPost("widgets/{widgetRefId:guid}/comments")]
    [AuthorizeReport(AccessLevel.Viewer)]
    public async Task<ActionResult<WidgetCommentDto>> Create(int reportId, Guid widgetRefId, CreateWidgetCommentDto dto) =>
        await comments.CreateAsync(reportId, widgetRefId, dto);

    /// <summary>Unguarded beyond Viewer, like the filter/view-state deletes: a user can always remove their own data.</summary>
    [HttpDelete("widgets/{widgetRefId:guid}/comments/{commentId:int}")]
    [AuthorizeReport(AccessLevel.Viewer)]
    public async Task<IActionResult> Delete(int reportId, Guid widgetRefId, int commentId)
    {
        await comments.DeleteAsync(reportId, widgetRefId, commentId);
        return NoContent();
    }

    /// <summary>Every widget's comment count on this report, so the grid doesn't fire one request per widget.</summary>
    [HttpGet("comment-counts")]
    [AuthorizeReport(AccessLevel.Viewer)]
    public async Task<ActionResult<Dictionary<Guid, int>>> GetCounts(int reportId) =>
        await comments.GetCountsAsync(reportId);
}
