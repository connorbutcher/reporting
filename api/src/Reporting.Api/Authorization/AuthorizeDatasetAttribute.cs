using Reporting.Abstractions;
using Reporting.DAL.Permissions;

namespace Reporting.Api.Authorization;

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
