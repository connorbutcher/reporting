namespace Reporting.Abstractions;

/// <summary>
/// Resolves the current request's user. Swapping the registered implementation — from the
/// dev stub to a claims-backed one — is the single change real authentication requires.
/// </summary>
public interface ICurrentUserAccessor
{
    Task<ICurrentUser> GetAsync();
}
