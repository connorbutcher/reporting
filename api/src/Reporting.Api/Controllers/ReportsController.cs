using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.Api.Authorization;
using Reporting.DAL;
using Reporting.DAL.Permissions;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController(
    ReportRepository reports,
    ResourceAuthorizer authorizer,
    ReportPersonalizationService personalization) : ControllerBase
{
    /// <summary>Reports directly inside <paramref name="folderId"/> (root if omitted) the caller can see — not the whole tree.</summary>
    [HttpGet]
    public async Task<ActionResult<List<ReportSummaryDto>>> GetAll([FromQuery] int? folderId)
    {
        var all = await reports.GetInFolderAsync(folderId);
        var favorites = await reports.FavoriteReportIdsAsync();
        return await authorizer.FilterVisibleReportsAsync(all, (r, level) => r.ToSummaryDto(level, favorites.Contains(r.Id)));
    }

    /// <summary>Every visible report across every folder, flat — for pickers that need the whole tree at once, like "copy from".</summary>
    [HttpGet("all")]
    public async Task<ActionResult<List<ReportSummaryDto>>> GetAllFlat()
    {
        var all = await reports.GetAllAsync();
        var favorites = await reports.FavoriteReportIdsAsync();
        return await authorizer.FilterVisibleReportsAsync(all, (r, level) => r.ToSummaryDto(level, favorites.Contains(r.Id)));
    }

    /// <summary>Finds visible reports anywhere in the tree by name (contains) or exact report number (accepts "42" or "R-42").</summary>
    [HttpGet("search")]
    public async Task<ActionResult<List<ReportSearchResultDto>>> Search([FromQuery] string? q)
    {
        var results = await reports.SearchAsync(q);
        var favorites = await reports.FavoriteReportIdsAsync();
        return await authorizer.FilterVisibleReportsAsync(
            results.Matches,
            (r, level) => r.ToSearchResultDto(results.PathByReportId[r.Id], level, favorites.Contains(r.Id)));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ReportSummaryDto>> GetById(int id)
    {
        var report = await reports.GetEntityAsync(id);
        if (report is null) return NotFound();
        var auth = await authorizer.AuthorizeReportAsync(report, AccessLevel.Viewer);
        if (!auth.Allowed) return this.ToActionResult(auth, AccessLevel.Viewer);

        var favorites = await reports.FavoriteReportIdsAsync();
        return report.ToSummaryDto(auth.Level, favorites.Contains(report.Id));
    }

    [HttpPost]
    public async Task<ActionResult<ReportSummaryDto>> Create(CreateReportDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A report needs a name.");

        // Creating a report is an Editor action on the destination folder (or the root).
        var createAuth = await authorizer.AuthorizeCreateInAsync(dto.FolderId);
        if (!createAuth.Allowed) return this.ToActionResult(createAuth, AccessLevel.Editor);

        // You can only duplicate a report you're allowed to see; hide the rest behind "does not exist".
        if (dto.SourceReportId is { } sourceId && !(await authorizer.AuthorizeReportAsync(sourceId, AccessLevel.Viewer)).Allowed)
            return BadRequest("Source report does not exist.");

        try
        {
            var report = await reports.CreateAsync(dto.Name.Trim(), dto.FolderId, dto.SourceReportId);
            var level = await authorizer.LevelForReportAsync(report);
            return CreatedAtAction(nameof(GetAll), report.ToSummaryDto(level, isFavorite: false));
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

        // Renaming or moving a report is a Manager action on it.
        var report = await reports.GetEntityAsync(id);
        if (report is null) return NotFound();
        var auth = await authorizer.AuthorizeReportAsync(report, AccessLevel.Manager);
        if (!auth.Allowed) return this.ToActionResult(auth, AccessLevel.Manager);

        // Moving into a different folder also needs Editor on the destination.
        if (report.FolderId != dto.FolderId)
        {
            var moveAuth = await authorizer.AuthorizeCreateInAsync(dto.FolderId);
            if (!moveAuth.Allowed) return this.ToActionResult(moveAuth, AccessLevel.Editor);
        }

        try
        {
            var updated = await reports.UpdateAsync(id, dto.Name.Trim(), dto.FolderId);
            if (updated is null) return NotFound();
            var level = await authorizer.LevelForReportAsync(updated);
            var favorites = await reports.FavoriteReportIdsAsync();
            return updated.ToSummaryDto(level, favorites.Contains(updated.Id));
        }
        catch (DataValidationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id:int}")]
    [AuthorizeReport(AccessLevel.Manager)]
    public async Task<IActionResult> Delete(int id) =>
        await reports.DeleteAsync(id) ? NoContent() : NotFound();

    // --- version history --------------------------------------------------

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

    // --- draft (checkout / autosave / publish) -----------------------------

    [HttpGet("{id:int}/draft")]
    [AuthorizeReport(AccessLevel.Editor)]
    public async Task<ActionResult<ReportRevisionDto>> GetDraft(int id)
    {
        var draft = await reports.GetDraftAsync(id);
        return draft is null ? NotFound() : draft;
    }

    /// <summary>Checks out a draft to edit. Idempotent: an existing draft is returned as-is.</summary>
    [HttpPost("{id:int}/draft")]
    [AuthorizeReport(AccessLevel.Editor)]
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
    [AuthorizeReport(AccessLevel.Editor)]
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
    [AuthorizeReport(AccessLevel.Editor)]
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
    [AuthorizeReport(AccessLevel.Editor)]
    public async Task<IActionResult> DiscardDraft(int id) =>
        await reports.DiscardDraftAsync(id) ? NoContent() : NotFound();

    // --- per-user state (favourite / recently viewed) ---------------------

    /// <summary>Stars the report for the current user. Idempotent; 404 if they can't see it.</summary>
    [HttpPost("{id:int}/favorite")]
    [AuthorizeReport(AccessLevel.Viewer)]
    public async Task<IActionResult> AddFavorite(int id) =>
        await personalization.AddFavoriteAsync(id) ? NoContent() : NotFound();

    /// <summary>Removes the current user's star. Idempotent.</summary>
    [HttpDelete("{id:int}/favorite")]
    public async Task<IActionResult> RemoveFavorite(int id)
    {
        await personalization.RemoveFavoriteAsync(id);
        return NoContent();
    }

    /// <summary>Records that the current user just opened the report, for their "recently viewed" list.</summary>
    [HttpPost("{id:int}/view")]
    [AuthorizeReport(AccessLevel.Viewer)]
    public async Task<IActionResult> RecordView(int id) =>
        await personalization.RecordViewAsync(id) ? NoContent() : NotFound();
}
