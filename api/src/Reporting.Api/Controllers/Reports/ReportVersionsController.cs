using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.Api.Authorization;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

/// <summary>A report's published versions and its checked-out draft (checkout, autosave, publish).</summary>
[ApiController]
[Route("api/reports")]
public class ReportVersionsController(ReportRepository reports) : ControllerBase
{
    [HttpGet("{id:int}/versions")]
    [AuthorizeReport(AccessLevel.Viewer)]
    public async Task<ActionResult<List<ReportVersionSummaryDto>>> GetVersions(int id)
    {
        var versions = await reports.GetVersionsAsync(id);
        return versions is null ? NotFound() : versions;
    }

    [HttpGet("{id:int}/versions/{versionNumber:int}")]
    [AuthorizeReport(AccessLevel.Viewer)]
    public async Task<ActionResult<ReportRevisionDto>> GetVersion(int id, int versionNumber)
    {
        var revision = await reports.GetVersionAsync(id, versionNumber);
        return revision is null ? NotFound() : revision;
    }

    [HttpGet("{id:int}/draft")]
    [AuthorizeReport(AccessLevel.Editor)]
    public async Task<ActionResult<ReportRevisionDto>> GetDraft(int id)
    {
        var draft = await reports.GetDraftAsync(id);
        return draft is null ? NotFound() : draft;
    }

    /// <summary>Idempotent: an existing draft is returned as-is.</summary>
    [HttpPost("{id:int}/draft")]
    [AuthorizeReport(AccessLevel.Editor)]
    public async Task<ActionResult<ReportRevisionDto>> Checkout(int id, CheckoutDraftDto dto)
    {
        var draft = await reports.CheckoutAsync(id, dto.FromVersionNumber);
        return draft is null ? NotFound() : draft;
    }

    [HttpPut("{id:int}/draft")]
    [AuthorizeReport(AccessLevel.Editor)]
    public async Task<ActionResult<ReportRevisionDto>> UpdateDraft(int id, ReportRevisionDto dto)
    {
        var draft = await reports.UpdateDraftAsync(id, dto);
        return draft is null ? NotFound() : draft;
    }

    [HttpPost("{id:int}/draft/publish")]
    [AuthorizeReport(AccessLevel.Editor)]
    public async Task<ActionResult<ReportVersionSummaryDto>> Publish(int id, PublishDraftDto dto)
    {
        var published = await reports.PublishAsync(id, dto.Notes);
        return published is null ? NotFound() : published;
    }

    [HttpDelete("{id:int}/draft")]
    [AuthorizeReport(AccessLevel.Editor)]
    public async Task<IActionResult> DiscardDraft(int id)
    {
        return await reports.DiscardDraftAsync(id) ? NoContent() : NotFound();
    }
}
