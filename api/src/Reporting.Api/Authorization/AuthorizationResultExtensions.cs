using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.DAL.Permissions;

namespace Reporting.Api.Authorization;

/// <summary>
/// The one mapping from an authorization outcome to a response: 404 when hidden or missing (so nothing
/// private leaks), 403 when below the required level, 400 when a mutation hits a published version.
/// Shared by the attributes and the few actions that authorize imperatively, so the two can't drift.
/// </summary>
public static class AuthorizationResultExtensions
{
    public static ActionResult ToActionResult(this ControllerBase controller, ResourceAuthorization auth, AccessLevel required)
    {
        return Map(auth, required);
    }

    internal static ActionResult Map(ResourceAuthorization auth, AccessLevel required)
    {
        return auth.Outcome switch
        {
            AccessOutcome.NotFound => new NotFoundResult(),
            AccessOutcome.ReadOnly => new BadRequestObjectResult("This report version's data is read-only."),
            _ => new ObjectResult($"This action requires {required} access.") { StatusCode = StatusCodes.Status403Forbidden }
        };
    }
}
