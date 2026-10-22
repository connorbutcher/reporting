using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.Api.Authorization;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

/// <summary>The current user's own state on a report: their star and their "recently viewed" entry.</summary>
[ApiController]
[Route("api/reports")]
public class ReportFavoritesController(ReportPersonalizationService personalization) : ControllerBase
{
    /// <summary>Idempotent; 404 if they can't see it.</summary>
    [HttpPost("{id:int}/favorite")]
    [AuthorizeReport(AccessLevel.Viewer)]
    public async Task<IActionResult> AddFavorite(int id)
    {
        return await personalization.AddFavoriteAsync(id) ? NoContent() : NotFound();
    }

    /// <summary>Idempotent, and unguarded: a user can always remove their own data.</summary>
    [HttpDelete("{id:int}/favorite")]
    public async Task<IActionResult> RemoveFavorite(int id)
    {
        await personalization.RemoveFavoriteAsync(id);
        return NoContent();
    }

    [HttpPost("{id:int}/view")]
    [AuthorizeReport(AccessLevel.Viewer)]
    public async Task<IActionResult> RecordView(int id)
    {
        return await personalization.RecordViewAsync(id) ? NoContent() : NotFound();
    }
}
