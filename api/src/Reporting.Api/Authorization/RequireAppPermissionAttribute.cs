using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Reporting.Abstractions;
using Reporting.DAL.Permissions;

namespace Reporting.Api.Authorization;

/// <summary>
/// Gates an action or controller on an application-wide <see cref="AppPermission"/> (see
/// <see cref="AppPermissionService"/>). A caller who lacks it is stopped at the edge — before model
/// binding or the action — with a 403 naming the permission. Global admins hold every permission, so
/// they always pass. This is the single enforcement point for app-permission gates; services no
/// longer re-check (group management, which also allows delegated managers, stays scope-based).
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class RequireAppPermissionAttribute(AppPermission permission) : Attribute, IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var appPermissions = context.HttpContext.RequestServices.GetRequiredService<AppPermissionService>();
        if (!await appPermissions.HasAsync(permission))
        {
            context.Result = new ObjectResult($"This action requires {permission.Describe()}.")
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
        }
    }
}
