using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController(ReportRepository reports) : ControllerBase
{
    /// <summary>Reports directly inside <paramref name="folderId"/> (root if omitted) — not the whole tree.</summary>
    [HttpGet]
    public async Task<ActionResult<List<ReportSummaryDto>>> GetAll([FromQuery] Guid? folderId) =>
        await reports.GetAllAsync(folderId);

    /// <summary>Finds reports anywhere in the tree by name (contains) or exact report number (accepts "42" or "R-42").</summary>
    [HttpGet("search")]
    public async Task<ActionResult<List<ReportSearchResultDto>>> Search([FromQuery] string? q) =>
        await reports.SearchAsync(q);

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ReportSummaryDto>> GetById(Guid id)
    {
        var report = await reports.GetByIdAsync(id);
        return report is null ? NotFound() : report;
    }

    [HttpPost]
    public async Task<ActionResult<ReportSummaryDto>> Create(CreateReportDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A report needs a name.");

        try
        {
            var report = await reports.CreateAsync(dto.Name.Trim(), dto.FolderId);
            return CreatedAtAction(nameof(GetAll), report);
        }
        catch (DataValidationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ReportSummaryDto>> Update(Guid id, SaveReportDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A report needs a name.");

        try
        {
            var report = await reports.UpdateAsync(id, dto.Name.Trim(), dto.FolderId);
            return report is null ? NotFound() : report;
        }
        catch (DataValidationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) =>
        await reports.DeleteAsync(id) ? NoContent() : NotFound();

    // --- version history --------------------------------------------------

    [HttpGet("{id:guid}/versions")]
    public async Task<ActionResult<List<ReportVersionSummaryDto>>> GetVersions(Guid id)
    {
        var versions = await reports.GetVersionsAsync(id);
        return versions is null ? NotFound() : versions;
    }

    [HttpGet("{id:guid}/versions/{versionNumber:int}")]
    public async Task<ActionResult<ReportRevisionDto>> GetVersion(Guid id, int versionNumber)
    {
        var revision = await reports.GetVersionAsync(id, versionNumber);
        return revision is null ? NotFound() : revision;
    }

    // --- draft (checkout / autosave / publish) -----------------------------

    [HttpGet("{id:guid}/draft")]
    public async Task<ActionResult<ReportRevisionDto>> GetDraft(Guid id)
    {
        var draft = await reports.GetDraftAsync(id);
        return draft is null ? NotFound() : draft;
    }

    /// <summary>Checks out a draft to edit. Idempotent: an existing draft is returned as-is.</summary>
    [HttpPost("{id:guid}/draft")]
    public async Task<ActionResult<ReportRevisionDto>> Checkout(Guid id, CheckoutDraftDto dto)
    {
        try
        {
            var draft = await reports.CheckoutAsync(id, dto.FromVersionNumber);
            return draft is null ? NotFound() : draft;
        }
        catch (DataNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpPut("{id:guid}/draft")]
    public async Task<ActionResult<ReportRevisionDto>> UpdateDraft(Guid id, ReportRevisionDto dto)
    {
        try
        {
            var draft = await reports.UpdateDraftAsync(id, dto);
            return draft is null ? NotFound() : draft;
        }
        catch (DataNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpPost("{id:guid}/draft/publish")]
    public async Task<ActionResult<ReportVersionSummaryDto>> Publish(Guid id, PublishDraftDto dto)
    {
        try
        {
            var published = await reports.PublishAsync(id, dto.Notes);
            return published is null ? NotFound() : published;
        }
        catch (DataNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpDelete("{id:guid}/draft")]
    public async Task<IActionResult> DiscardDraft(Guid id) =>
        await reports.DiscardDraftAsync(id) ? NoContent() : NotFound();
}
