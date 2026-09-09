using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.DAL.Permissions;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

/// <summary>The signed-in user's own identity and app permissions — drives admin navigation and route guards on the client.</summary>
[ApiController]
[Route("api/me")]
public class MeController(
    ICurrentUserAccessor currentUserAccessor,
    AppPermissionService appPermissions,
    UserGroupAdminService userGroups,
    ReportPersonalizationService personalization) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<CurrentUserDto>> Get()
    {
        var user = await currentUserAccessor.GetAsync();
        var permissions = await appPermissions.ForCurrentUserAsync();
        return new CurrentUserDto
        {
            Id = user.RefId,
            DisplayName = user.DisplayName,
            Email = user.Email,
            IsGlobalAdmin = user.IsGlobalAdmin,
            Permissions = permissions.ToList(),
            CanManageUsers = permissions.Contains(AppPermission.ManageUsers),
            CanManageGroups = await userGroups.CurrentUserManagesAnyGroupAsync()
        };
    }

    /// <summary>The reports the current user has starred.</summary>
    [HttpGet("favorites")]
    public async Task<ActionResult<List<ReportSummaryDto>>> GetFavorites() =>
        await personalization.GetFavoritesAsync();

    /// <summary>The current user's most-recently-opened reports, newest first.</summary>
    [HttpGet("recent")]
    public async Task<ActionResult<List<ReportSummaryDto>>> GetRecent([FromQuery] int take = 8) =>
        await personalization.GetRecentAsync(Math.Clamp(take, 1, 24));
}
