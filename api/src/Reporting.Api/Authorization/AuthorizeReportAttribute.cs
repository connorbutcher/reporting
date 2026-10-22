using Reporting.Abstractions;
using Reporting.DAL.Permissions;

namespace Reporting.Api.Authorization;

/// <summary>Requires <paramref name="required"/> on the report named by the route (default key "reportId", falling back to "id").</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class AuthorizeReportAttribute(AccessLevel required) : ResourceAuthorizeAttribute(required, "reportId")
{
    protected override Task<ResourceAuthorization> AuthorizeAsync(ResourceAuthorizer authorizer, int id)
    {
        return authorizer.AuthorizeReportAsync(id, Required);
    }
}
