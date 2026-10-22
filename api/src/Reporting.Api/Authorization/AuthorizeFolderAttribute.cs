using Reporting.Abstractions;
using Reporting.DAL.Permissions;

namespace Reporting.Api.Authorization;

/// <summary>Requires <paramref name="required"/> on the folder named by the route (default key "folderId", falling back to "id").</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class AuthorizeFolderAttribute(AccessLevel required) : ResourceAuthorizeAttribute(required, "folderId")
{
    protected override Task<ResourceAuthorization> AuthorizeAsync(ResourceAuthorizer authorizer, int id) =>
        authorizer.AuthorizeFolderAsync(id, Required);
}
