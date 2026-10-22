using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Reporting.Abstractions;
using Reporting.DAL.Permissions;

namespace Reporting.Api.Authorization;

/// <summary>
/// Gates an action or controller on an app-wide <see cref="AppPermission"/>, with a 403 naming it.
/// The single enforcement point: services don't re-check.
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
