using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.DAL.Permissions;

namespace Reporting.Api.Authorization;

/// <summary>
/// The single mapping from a <see cref="ResourceAuthorization"/> to the HTTP response the API returns —
/// 404 when hidden/missing (so nothing private leaks), 403 when visible but below the required level,
/// 400 when a mutation hits a published version's immutable data. Shared by the resource-authorization
/// attributes (which stop a denied request at the edge) and by the few actions that authorize
/// imperatively — because they need the resolved level for the response body (a report summary carries
/// the caller's level) or because the check depends on the request body (moving a report needs Editor
/// on the destination folder). One place so the two paths can never drift.
/// </summary>
public static class AuthorizationResultExtensions
{
    public static ActionResult ToActionResult(this ControllerBase controller, ResourceAuthorization auth, AccessLevel required) =>
        Map(auth, required);

    /// <summary>The outcome→result mapping itself, callable without a <see cref="ControllerBase"/> (the attributes use it).</summary>
    internal static ActionResult Map(ResourceAuthorization auth, AccessLevel required) => auth.Outcome switch
    {
        AccessOutcome.NotFound => new NotFoundResult(),
        AccessOutcome.ReadOnly => new BadRequestObjectResult("This report version's data is read-only."),
        _ => new ObjectResult($"This action requires {required} access.") { StatusCode = StatusCodes.Status403Forbidden }
    };
}
