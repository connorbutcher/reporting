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
    ResourceAuthorizer authorizer) : ControllerBase
{
    /// <summary>Visible reports directly inside <paramref name="folderId"/> (root if omitted).</summary>
    [HttpGet]
    public async Task<ActionResult<List<ReportSummaryDto>>> GetAll([FromQuery] int? folderId)
    {
        var all = await reports.GetInFolderAsync(folderId);
        var favorites = await reports.FavoriteReportIdsAsync();
        return await authorizer.FilterVisibleReportsAsync(all, (r, level) => r.ToSummaryDto(level, favorites.Contains(r.Id)));
    }

    /// <summary>Every visible report, flat, for pickers like "copy from".</summary>
    [HttpGet("all")]
    public async Task<ActionResult<List<ReportSummaryDto>>> GetAllFlat()
    {
        var all = await reports.GetAllAsync();
        var favorites = await reports.FavoriteReportIdsAsync();
        return await authorizer.FilterVisibleReportsAsync(all, (r, level) => r.ToSummaryDto(level, favorites.Contains(r.Id)));
    }

    /// <summary>By name (contains) or exact number ("42" or "R-42").</summary>
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
        if (report is null)
        {
            return NotFound();
        }

        var auth = await authorizer.AuthorizeReportAsync(report, AccessLevel.Viewer);
        if (!auth.Allowed)
        {
            return this.ToActionResult(auth, AccessLevel.Viewer);
        }

        var favorites = await reports.FavoriteReportIdsAsync();
        return report.ToSummaryDto(auth.Level, favorites.Contains(report.Id));
    }

    /// <summary>
    /// Without <paramref name="excludeId"/> this is a create check (Editor on the folder); with one it's a
    /// rename check (Manager on that report), matching the actions it precedes.
    /// </summary>
    [HttpGet("name-available")]
    public async Task<ActionResult<ReportNameAvailableDto>> NameAvailable(
        [FromQuery] string name, [FromQuery] int? folderId, [FromQuery] int? excludeId)
    {
        var auth = excludeId is { } id
            ? await authorizer.AuthorizeReportAsync(id, AccessLevel.Manager)
            : await authorizer.AuthorizeCreateInAsync(folderId);
        if (!auth.Allowed)
        {
            return this.ToActionResult(auth, excludeId is null ? AccessLevel.Editor : AccessLevel.Manager);
        }

        return new ReportNameAvailableDto
        {
            Available = await reports.NameAvailableAsync(name, folderId, excludeId)
        };
    }

    [HttpPost]
    public async Task<ActionResult<ReportSummaryDto>> Create(CreateReportDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("A report needs a name.");
        }

        var createAuth = await authorizer.AuthorizeCreateInAsync(dto.FolderId);
        if (!createAuth.Allowed)
        {
            return this.ToActionResult(createAuth, AccessLevel.Editor);
        }

        // A source the caller can't see is hidden behind "does not exist".
        if (dto.SourceReportId is { } sourceId && !(await authorizer.AuthorizeReportAsync(sourceId, AccessLevel.Viewer)).Allowed)
        {
            return BadRequest("Source report does not exist.");
        }

        var report = await reports.CreateAsync(dto.Name.Trim(), dto.FolderId, dto.SourceReportId);
        var level = await authorizer.LevelForReportAsync(report);
        return CreatedAtAction(nameof(GetAll), report.ToSummaryDto(level, isFavorite: false));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ReportSummaryDto>> Update(int id, SaveReportDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("A report needs a name.");
        }

        var report = await reports.GetEntityAsync(id);
        if (report is null)
        {
            return NotFound();
        }

        var auth = await authorizer.AuthorizeReportAsync(report, AccessLevel.Manager);
        if (!auth.Allowed)
        {
            return this.ToActionResult(auth, AccessLevel.Manager);
        }

        // Moving into a different folder also needs Editor on the destination.
        if (report.FolderId != dto.FolderId)
        {
            var moveAuth = await authorizer.AuthorizeCreateInAsync(dto.FolderId);
            if (!moveAuth.Allowed)
            {
                return this.ToActionResult(moveAuth, AccessLevel.Editor);
            }
        }

        var updated = await reports.UpdateAsync(id, dto.Name.Trim(), dto.FolderId);
        if (updated is null)
        {
            return NotFound();
        }

        var level = await authorizer.LevelForReportAsync(updated);
        var favorites = await reports.FavoriteReportIdsAsync();
        return updated.ToSummaryDto(level, favorites.Contains(updated.Id));
    }

    [HttpDelete("{id:int}")]
    [AuthorizeReport(AccessLevel.Manager)]
    public async Task<IActionResult> Delete(int id)
    {
        return await reports.DeleteAsync(id) ? NoContent() : NotFound();
    }
}
