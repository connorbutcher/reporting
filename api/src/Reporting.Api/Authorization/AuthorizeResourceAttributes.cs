using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Reporting.Abstractions;
using Reporting.DAL.Permissions;

namespace Reporting.Api.Authorization;

/// <summary>
/// Shared base for the resource-authorization attributes. Reads the target's id from the route,
/// delegates the decision to the one <see cref="ResourceAuthorizer"/>, and maps the outcome to the
/// right status at the edge — 404 when hidden/missing (so nothing private leaks), 403 when visible
/// but below the required level, 400 when a mutation hits a published version's immutable data. A
/// denied request never reaches the action.
/// </summary>
public abstract class ResourceAuthorizeAttribute(AccessLevel required, string routeKey)
    : Attribute, IAsyncAuthorizationFilter
{
    protected AccessLevel Required { get; } = required;

    /// <summary>The route parameter carrying the target's id (e.g. "id", "reportId", "folderId").</summary>
    public string RouteKey { get; set; } = routeKey;

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        if (!TryGetId(context, out var id))
        {
            context.Result = new NotFoundResult();
            return;
        }

        var authorizer = context.HttpContext.RequestServices.GetRequiredService<ResourceAuthorizer>();
        var result = await AuthorizeAsync(authorizer, id);
        if (!result.Allowed) context.Result = ToResult(result);
    }

    protected abstract Task<ResourceAuthorization> AuthorizeAsync(ResourceAuthorizer authorizer, int id);

    private bool TryGetId(AuthorizationFilterContext context, out int id)
    {
        var values = context.RouteData.Values;
        // The configured key (e.g. "reportId" on a nested route), falling back to a plain "id"
        // so the same attribute serves both {id:int} and {reportId:int}/{folderId:int} routes.
        if (values.TryGetValue(RouteKey, out var raw) && int.TryParse(raw?.ToString(), out id)) return true;
        if (RouteKey != "id" && values.TryGetValue("id", out var fallback) && int.TryParse(fallback?.ToString(), out id))
            return true;
        id = 0;
        return false;
    }

    private IActionResult ToResult(ResourceAuthorization result) => result.Outcome switch
    {
        AccessOutcome.NotFound => new NotFoundResult(),
        AccessOutcome.ReadOnly => new BadRequestObjectResult("This report version's data is read-only."),
        _ => new ObjectResult($"This action requires {Required} access.") { StatusCode = StatusCodes.Status403Forbidden }
    };
}

/// <summary>Requires <paramref name="required"/> on the report named by the route (default key "reportId", falling back to "id").</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class AuthorizeReportAttribute(AccessLevel required) : ResourceAuthorizeAttribute(required, "reportId")
{
    protected override Task<ResourceAuthorization> AuthorizeAsync(ResourceAuthorizer authorizer, int id) =>
        authorizer.AuthorizeReportAsync(id, Required);
}

/// <summary>Requires <paramref name="required"/> on the folder named by the route (default key "folderId", falling back to "id").</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class AuthorizeFolderAttribute(AccessLevel required) : ResourceAuthorizeAttribute(required, "folderId")
{
    protected override Task<ResourceAuthorization> AuthorizeAsync(ResourceAuthorizer authorizer, int id) =>
        authorizer.AuthorizeFolderAsync(id, Required);
}

/// <summary>
/// Requires <paramref name="required"/> on the report that owns the dataset named by the route
/// ("id"). Set <see cref="Mutation"/> so a write against a published version's data is refused as 400.
/// </summary>
[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public sealed class AuthorizeDatasetAttribute(AccessLevel required) : ResourceAuthorizeAttribute(required, "id")
{
    /// <summary>When true, the action mutates the dataset, so it's refused on an immutable published version.</summary>
    public bool Mutation { get; set; }

    protected override Task<ResourceAuthorization> AuthorizeAsync(ResourceAuthorizer authorizer, int id) =>
        authorizer.AuthorizeDatasetAsync(id, Required, Mutation);
}
