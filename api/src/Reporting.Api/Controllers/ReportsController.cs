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
    public async Task<ActionResult<List<ReportSummaryDto>>> GetAll([FromQuery] int? folderId) =>
        await reports.GetAllAsync(folderId);

    /// <summary>Every report across every folder, flat — for pickers that need the whole tree at once, like "copy from".</summary>
    [HttpGet("all")]
    public async Task<ActionResult<List<ReportSummaryDto>>> GetAllFlat() =>
        await reports.GetAllFlatAsync();

    /// <summary>Finds reports anywhere in the tree by name (contains) or exact report number (accepts "42" or "R-42").</summary>
    [HttpGet("search")]
    public async Task<ActionResult<List<ReportSearchResultDto>>> Search([FromQuery] string? q) =>
        await reports.SearchAsync(q);

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ReportSummaryDto>> GetById(int id)
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
            var report = await reports.CreateAsync(dto.Name.Trim(), dto.FolderId, dto.SourceReportId);
            return CreatedAtAction(nameof(GetAll), report);
        }
        catch (DataValidationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ReportSummaryDto>> Update(int id, SaveReportDto dto)
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

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id) =>
        await reports.DeleteAsync(id) ? NoContent() : NotFound();

    // --- version history --------------------------------------------------

    [HttpGet("{id:int}/versions")]
    public async Task<ActionResult<List<ReportVersionSummaryDto>>> GetVersions(int id)
    {
        var versions = await reports.GetVersionsAsync(id);
        return versions is null ? NotFound() : versions;
    }

    [HttpGet("{id:int}/versions/{versionNumber:int}")]
    public async Task<ActionResult<ReportRevisionDto>> GetVersion(int id, int versionNumber)
    {
        var revision = await reports.GetVersionAsync(id, versionNumber);
        return revision is null ? NotFound() : revision;
    }

    // --- draft (checkout / autosave / publish) -----------------------------

    [HttpGet("{id:int}/draft")]
    public async Task<ActionResult<ReportRevisionDto>> GetDraft(int id)
    {
        var draft = await reports.GetDraftAsync(id);
        return draft is null ? NotFound() : draft;
    }

    /// <summary>Checks out a draft to edit. Idempotent: an existing draft is returned as-is.</summary>
    [HttpPost("{id:int}/draft")]
    public async Task<ActionResult<ReportRevisionDto>> Checkout(int id, CheckoutDraftDto dto)
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

    [HttpPut("{id:int}/draft")]
    public async Task<ActionResult<ReportRevisionDto>> UpdateDraft(int id, ReportRevisionDto dto)
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

    [HttpPost("{id:int}/draft/publish")]
    public async Task<ActionResult<ReportVersionSummaryDto>> Publish(int id, PublishDraftDto dto)
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

    [HttpDelete("{id:int}/draft")]
    public async Task<IActionResult> DiscardDraft(int id) =>
        await reports.DiscardDraftAsync(id) ? NoContent() : NotFound();
}
