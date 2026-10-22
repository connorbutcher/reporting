using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Reporting.Abstractions;
using Reporting.DAL.Permissions;

namespace Reporting.Api.Authorization;

/// <summary>Reads the target's id from the route and stops a denied request before it reaches the action.</summary>
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
        if (!result.Allowed)
        {
            context.Result = AuthorizationResultExtensions.Map(result, Required);
        }
    }

    protected abstract Task<ResourceAuthorization> AuthorizeAsync(ResourceAuthorizer authorizer, int id);

    private bool TryGetId(AuthorizationFilterContext context, out int id)
    {
        var values = context.RouteData.Values;
        // Falls back to a plain "id" so one attribute serves both {id:int} and {reportId:int} routes.
        if (values.TryGetValue(RouteKey, out var raw) && int.TryParse(raw?.ToString(), out id))
        {
            return true;
        }

        if (RouteKey != "id" && values.TryGetValue("id", out var fallback) && int.TryParse(fallback?.ToString(), out id))
        {
            return true;
        }

        id = 0;
        return false;
    }
}
