using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.DAL.Permissions;

namespace Reporting.Api.Authorization;

/// <summary>
/// Maps a <see cref="ResourceAuthorization"/> to the HTTP response the API returns, for the few
/// actions that authorize imperatively rather than by attribute — because they need the resolved
/// level for the response body (a report summary carries the caller's level) or because the check
/// depends on the request body (moving a report needs Editor on the destination folder). Keeps the
/// 404/403/400 mapping identical to the attributes'.
/// </summary>
public static class AuthorizationResultExtensions
{
    public static ActionResult ToActionResult(this ControllerBase controller, ResourceAuthorization auth, AccessLevel required) =>
        auth.Outcome switch
        {
            AccessOutcome.NotFound => controller.NotFound(),
            AccessOutcome.ReadOnly => controller.BadRequest("This report version's data is read-only."),
            _ => controller.StatusCode(StatusCodes.Status403Forbidden, $"This action requires {required} access.")
        };
}
